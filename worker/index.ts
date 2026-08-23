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
  deviceId: string;
  num: number;
  country: string;
  gender: Gender;
  preference: Preference;
  shitStartedAt: number;
  state: "idle" | "queued" | "paired";
  /** When they joined the queue, so the longest wait is served first. */
  queuedAt: number;
  partner: Client | null;
  /** Device ids this client has blocked. Held for the lifetime of the lobby. */
  blocked: Set<string>;
  sentAt: number[];
};

export class Lobby implements DurableObject {
  private clients = new Set<Client>();
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
      deviceId: "",
      num: 10000 + Math.floor(Math.random() * 89999),
      country,
      gender: "man",
      preference: "anyone",
      shitStartedAt: Date.now(),
      state: "idle",
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
        client.deviceId = String(message.deviceId).slice(0, 64);
        client.gender = message.gender;
        client.preference = message.preference;
        client.shitStartedAt = Date.now();
        return;
      }

      case "queue": {
        if (client.state === "paired") this.partClient(client, "leave");
        client.state = "queued";
        client.queuedAt = Date.now();
        this.tryPair(client);
        this.broadcastWaiting();
        return;
      }

      case "cancel": {
        if (client.state === "queued") client.state = "idle";
        this.broadcastWaiting();
        return;
      }

      case "msg": {
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
          client.blocked.add(partner.deviceId);
          partner.blocked.add(client.deviceId);
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
            reported: partner?.num ?? null,
            reportedCountry: partner?.country ?? null,
            reason: message.reason ?? null,
            context: transcript.slice(-20),
          }),
        );
        if (partner) {
          client.blocked.add(partner.deviceId);
          partner.blocked.add(client.deviceId);
        }
        this.partClient(client, "leave");
        return;
      }

      default:
        this.send(client, { t: "error", code: "bad_message" });
    }
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
      this.send(client, { t: "matched", partner: this.describe(candidate), serverNow });
      this.send(candidate, { t: "matched", partner: this.describe(client), serverNow });
    }
  }

  private compatible(a: Client, b: Client): boolean {
    if (a.deviceId && b.deviceId && a.deviceId === b.deviceId) return false;
    if (a.blocked.has(b.deviceId) || b.blocked.has(a.deviceId)) return false;
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
    this.partClient(client, "disconnect");
    this.clients.delete(client);
    this.broadcastOnline();
    this.broadcastWaiting();
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
