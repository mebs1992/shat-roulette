import { FRIEND_TOKEN_TTL_MS, mintFriendToken, readTicket } from "../shared/ticket";
import {
  MAX_MESSAGE_LENGTH,
  RATE_LIMIT,
  RATE_WINDOW_MS,
  type ClientMessage,
  type Gender,
  type Preference,
  type ServerMessage,
} from "./protocol";

export interface Env {
  LOBBY: DurableObjectNamespace;
  /** Shared with the app, which mints the tickets. Set before launch. */
  LOBBY_TICKET_SECRET?: string;
  /** Same database as the app: reports and bans live here. */
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      // Everyone shares one lobby. When one lobby stops coping, shard by
      // preference (a lobby per pool) and give each pair its own room object —
      // the wire protocol below does not change when that happens.
      const id = env.LOBBY.idFromName("global");
      return env.LOBBY.get(id).fetch(request);
    }

    if (url.pathname === "/health") {
      return new Response("ok", { headers: { "content-type": "text/plain" } });
    }

    return new Response("Not found", { status: 404 });
  },
};

type Client = {
  socket: WebSocket;
  /** Account id from a verified ticket. Empty until hello succeeds. */
  userId: string;
  num: number;
  country: string;
  gender: Gender;
  preference: Preference;
  shitStartedAt: number;
  state: "idle" | "queued" | "paired" | "inroom";
  /** The private room this client is waiting in or paired through, if any. */
  room: string | null;
  /** When they joined the queue, so the longest wait is served first. */
  queuedAt: number;
  partner: Client | null;
  /** Account ids this client has blocked. Held for the lifetime of the lobby. */
  blocked: Set<string>;
  sentAt: number[];
};

export class Lobby implements DurableObject {
  private clients = new Set<Client>();
  /** roomId -> the first friend waiting there, until the second arrives. */
  private rooms = new Map<string, Client>();
  private readonly ticketSecret: string;
  private readonly db: D1Database;

  /** Three DIFFERENT reporters and an account is banned. */
  private static readonly BAN_THRESHOLD = 3;

  constructor(_state: DurableObjectState, env: Env) {
    // No fallback: an unset secret means every ticket is refused (fail closed),
    // never accepted against a secret an attacker could read in the repo.
    this.ticketSecret = env.LOBBY_TICKET_SECRET ?? "";
    this.db = env.DB;
    if (!this.ticketSecret) {
      console.error("LOBBY_TICKET_SECRET is unset — the lobby will refuse all connections.");
    }
  }
  /** Kept only so a report can carry context. Dropped when the pair ends. */
  private transcripts = new WeakMap<Client, { from: string; text: string }[]>();

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [clientSide, serverSide] = Object.values(pair);
    serverSide.accept();

    // Cloudflare hands us the country for free. Locally there is no `cf`.
    const country = (request as { cf?: { country?: string } }).cf?.country ?? "??";

    const client: Client = {
      socket: serverSide,
      userId: "",
      // Replaced by the account's number once the ticket is verified.
      num: 0,
      country,
      gender: "man",
      preference: "anyone",
      shitStartedAt: Date.now(),
      state: "idle",
      room: null,
      queuedAt: 0,
      partner: null,
      blocked: new Set(),
      sentAt: [],
    };
    this.clients.add(client);

    serverSide.addEventListener("message", (event: MessageEvent) => {
      let parsed: ClientMessage;
      try {
        parsed = JSON.parse(String(event.data)) as ClientMessage;
      } catch {
        this.send(client, { t: "error", code: "bad_message" });
        return;
      }
      this.handle(client, parsed);
    });

    const drop = () => this.disconnect(client);
    serverSide.addEventListener("close", drop);
    serverSide.addEventListener("error", drop);

    this.send(client, {
      t: "welcome",
      num: client.num,
      country: client.country,
      online: this.clients.size,
      serverNow: Date.now(),
    });
    this.broadcastOnline();

    return new Response(null, { status: 101, webSocket: clientSide });
  }

  private handle(client: Client, message: ClientMessage) {
    switch (message.t) {
      case "hello": {
        void this.identify(client, message.ticket, message.gender, message.preference);
        return;
      }

      case "queue": {
        if (!client.userId) {
          this.send(client, { t: "error", code: "unauthenticated" });
          return;
        }
        // Leaving is always explicit (leave / block / report), so a queue from
        // a client we already paired is an accident — a re-fired effect, a
        // reconnect, a double tap. It used to tear down the live chat and tell
        // the other person they had been left. Ignore it instead.
        if (client.state === "paired") return;
        client.state = "queued";
        client.queuedAt = Date.now();
        this.tryPair(client);
        this.broadcastWaiting();
        return;
      }

      case "cancel": {
        if (client.state === "queued") client.state = "idle";
        this.leaveRoom(client);
        this.broadcastWaiting();
        return;
      }

      case "joinRoom": {
        if (!client.userId) {
          this.send(client, { t: "error", code: "unauthenticated" });
          return;
        }
        if (client.state === "paired") this.partClient(client, "leave");
        const roomId = String(message.roomId ?? "").slice(0, 100);
        if (!roomId) return;
        this.joinRoom(client, roomId);
        return;
      }

      case "msg": {
        if (!client.userId) {
          this.send(client, { t: "error", code: "unauthenticated" });
          return;
        }
        const partner = client.partner;
        if (client.state !== "paired" || !partner) {
          this.send(client, { t: "error", code: "not_paired" });
          return;
        }
        const text = String(message.text ?? "").trim();
        if (!text) return;
        if (text.length > MAX_MESSAGE_LENGTH) {
          this.send(client, { t: "error", code: "too_long" });
          return;
        }
        if (this.isRateLimited(client)) {
          this.send(client, { t: "error", code: "rate_limited" });
          return;
        }
        const at = Date.now();
        this.remember(client, partner, text);
        this.send(partner, { t: "msg", text, at });
        return;
      }

      case "typing": {
        if (client.partner) this.send(client.partner, { t: "typing", on: Boolean(message.on) });
        return;
      }

      case "leave": {
        this.partClient(client, "leave");
        return;
      }

      case "block": {
        const partner = client.partner;
        if (partner) {
          // Both directions, so neither can be served the other again.
          client.blocked.add(partner.userId);
          partner.blocked.add(client.userId);
        }
        this.partClient(client, "leave");
        return;
      }

      case "report": {
        const partner = client.partner;
        const transcript = partner ? (this.transcripts.get(partner) ?? []) : [];
        // Structured so `wrangler tail` shows it. Wire this to Email Routing
        // when there is an inbox to send it to.
        console.log(
          JSON.stringify({
            kind: "REPORT",
            at: new Date().toISOString(),
            reporter: client.num,
            reporterUserId: client.userId,
            reported: partner?.num ?? null,
            reportedUserId: partner?.userId ?? null,
            reportedCountry: partner?.country ?? null,
            reason: message.reason ?? null,
            context: transcript.slice(-20),
          }),
        );
        if (partner) {
          client.blocked.add(partner.userId);
          partner.blocked.add(client.userId);
        }
        this.partClient(client, "leave");
        return;
      }

      default:
        this.send(client, { t: "error", code: "bad_message" });
    }
  }

  /** Verifies a ticket and adopts the account identity it carries. */
  private async identify(client: Client, ticket: string, gender: Gender, preference: Preference) {
    const payload = this.ticketSecret ? await readTicket(ticket, this.ticketSecret) : null;
    if (!payload) {
      this.send(client, { t: "error", code: "unauthenticated" });
      return;
    }
    if (await this.isBanned(payload.u)) {
      this.send(client, { t: "error", code: "banned" });
      return;
    }
    client.userId = payload.u;
    client.num = payload.n;
    client.gender = gender;
    client.preference = preference;
    client.shitStartedAt = Date.now();
    this.send(client, { t: "identified", num: client.num });
  }

  /** A pass each side can redeem to add the other as a friend. */
  private async friendToken(me: Client, them: Client): Promise<string> {
    return mintFriendToken(
      { me: me.userId, them: them.userId, n: them.num, exp: Date.now() + FRIEND_TOKEN_TTL_MS },
      this.ticketSecret,
    );
  }

  /** Direct pairing: two friends who both present the same room id. */
  private async joinRoom(client: Client, roomId: string) {
    const waiting = this.rooms.get(roomId);
    if (waiting && waiting !== client && waiting.state !== "paired" && this.compatible(client, waiting)) {
      this.rooms.delete(roomId);
      client.state = waiting.state = "paired";
      client.partner = waiting;
      waiting.partner = client;
      client.room = waiting.room = roomId;
      this.transcripts.set(client, []);
      this.transcripts.set(waiting, []);
      const serverNow = Date.now();
      const [forA, forB] = await Promise.all([this.friendToken(client, waiting), this.friendToken(waiting, client)]);
      this.send(client, { t: "matched", partner: this.describe(waiting), serverNow, friendToken: forA, direct: true });
      this.send(waiting, { t: "matched", partner: this.describe(client), serverNow, friendToken: forB, direct: true });
      return;
    }
    // First to arrive holds the room open for the friend.
    this.leaveRoom(client);
    client.state = "inroom";
    client.room = roomId;
    this.rooms.set(roomId, client);
  }

  private leaveRoom(client: Client) {
    if (client.room && this.rooms.get(client.room) === client) this.rooms.delete(client.room);
    client.room = null;
  }

  private tryPair(client: Client) {
    // Longest wait first. Without this, a narrow filter can starve behind
    // whoever happened to open a socket earliest.
    const waiting = [...this.clients]
      .filter((c) => c !== client && c.state === "queued" && this.compatible(client, c))
      .sort((a, b) => a.queuedAt - b.queuedAt);

    const candidate = waiting[0];
    if (candidate) {
      client.state = candidate.state = "paired";
      client.partner = candidate;
      candidate.partner = client;
      this.transcripts.set(client, []);
      this.transcripts.set(candidate, []);

      const serverNow = Date.now();
      void Promise.all([this.friendToken(client, candidate), this.friendToken(candidate, client)]).then(
        ([forClient, forCandidate]) => {
          this.send(client, { t: "matched", partner: this.describe(candidate), serverNow, friendToken: forClient });
          this.send(candidate, { t: "matched", partner: this.describe(client), serverNow, friendToken: forCandidate });
        },
      );
    }
  }

  private compatible(a: Client, b: Client): boolean {
    // Never yourself — including a second tab or a second device.
    if (!a.userId || !b.userId || a.userId === b.userId) return false;
    if (a.blocked.has(b.userId) || b.blocked.has(a.userId)) return false;
    const aWantsB = a.preference === "anyone" || a.preference === b.gender;
    const bWantsA = b.preference === "anyone" || b.preference === a.gender;
    return aWantsB && bWantsA;
  }

  private describe(client: Client) {
    return {
      num: client.num,
      country: client.country,
      gender: client.gender,
      shitStartedAt: client.shitStartedAt,
    };
  }

  /** Unpair `client`, telling the other side why. */
  private partClient(client: Client, reason: "leave" | "disconnect") {
    const partner = client.partner;
    client.partner = null;
    client.state = "idle";
    client.room = null;
    this.transcripts.delete(client);

    if (partner) {
      partner.partner = null;
      partner.state = "idle";
      this.transcripts.delete(partner);
      this.send(partner, { t: "left", reason });
    }
  }

  private disconnect(client: Client) {
    if (!this.clients.has(client)) return;
    this.leaveRoom(client);
    this.partClient(client, "disconnect");
    this.clients.delete(client);
    this.broadcastOnline();
    this.broadcastWaiting();
  }

  /** True if this account has been banned. Missing DB fails OPEN — a broken
   *  ban check must not lock everyone out. */
  private async isBanned(userId: string): Promise<boolean> {
    if (!this.db) return false;
    try {
      const row = await this.db
        .prepare("SELECT banned_at FROM users WHERE id = ?")
        .bind(userId)
        .first<{ banned_at: number | null }>();
      return row?.banned_at != null;
    } catch {
      return false;
    }
  }

  /** Records a report (deduped per reporter) and bans at three distinct ones. */
  private async recordReport(reporterId: string, reportedId: string): Promise<void> {
    if (!this.db || !reporterId || !reportedId || reporterId === reportedId) return;
    try {
      await this.db
        .prepare("INSERT OR IGNORE INTO reports (reporter_id, reported_id, created_at) VALUES (?, ?, ?)")
        .bind(reporterId, reportedId, Date.now())
        .run();
      const count = await this.db
        .prepare("SELECT COUNT(*) AS n FROM reports WHERE reported_id = ?")
        .bind(reportedId)
        .first<{ n: number }>();
      if ((count?.n ?? 0) >= Lobby.BAN_THRESHOLD) {
        await this.db
          .prepare("UPDATE users SET banned_at = ? WHERE id = ? AND banned_at IS NULL")
          .bind(Date.now(), reportedId)
          .run();
      }
    } catch (error) {
      console.error("recordReport failed:", (error as Error).message);
    }
  }

  private isRateLimited(client: Client): boolean {
    const now = Date.now();
    client.sentAt = client.sentAt.filter((t) => now - t < RATE_WINDOW_MS);
    if (client.sentAt.length >= RATE_LIMIT) return true;
    client.sentAt.push(now);
    return false;
  }

  private remember(from: Client, to: Client, text: string) {
    for (const side of [from, to]) {
      const log = this.transcripts.get(side);
      if (!log) continue;
      log.push({ from: String(from.num), text });
      if (log.length > 20) log.shift();
    }
  }

  private send(client: Client, message: ServerMessage) {
    try {
      client.socket.send(JSON.stringify(message));
    } catch {
      // Socket already gone; the close handler will clean it up.
    }
  }

  private broadcastOnline() {
    const count = this.clients.size;
    for (const client of this.clients) this.send(client, { t: "online", count });
  }

  private broadcastWaiting() {
    let queued = 0;
    for (const client of this.clients) if (client.state === "queued") queued += 1;
    for (const client of this.clients) {
      if (client.state === "queued") this.send(client, { t: "waiting", queued });
    }
  }
}
