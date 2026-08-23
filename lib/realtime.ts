"use client";

import type {
  ClientMessage,
  Gender,
  PartnerInfo,
  Preference,
  ServerMessage,
} from "@/worker/protocol";

export type { Gender, PartnerInfo, Preference, ServerMessage };

export type Connection = "connecting" | "online" | "offline";

/**
 * A short-lived signed pass from the app, proving which account is connecting.
 * Fetched fresh on every identify so an expired one can never be reused.
 */
async function fetchTicket(): Promise<string | null> {
  try {
    const response = await fetch("/api/lobby-ticket", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { ticket?: string };
    return data.ticket ?? null;
  } catch {
    return null;
  }
}

/** The deployed lobby. The app is served from a different host, so there is no
 *  sane same-origin guess — this is the fallback when nothing is configured. */
const DEPLOYED_LOBBY = "wss://shat-roulette.marcus-ebbeck92.workers.dev/ws";

function endpoint(): string {
  return process.env.NEXT_PUBLIC_REALTIME_URL || DEPLOYED_LOBBY;
}

type Handlers = {
  onMessage: (message: ServerMessage) => void;
  onConnection: (state: Connection) => void;
};

/**
 * Thin websocket client with backoff. It reconnects, but it deliberately does
 * not try to restore a chat: the other person is gone, and pretending
 * otherwise would be a lie.
 */
export class Realtime {
  private socket: WebSocket | null = null;
  private attempts = 0;
  private closed = false;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private identity: { gender: Gender; preference: Preference } | null = null;

  constructor(private handlers: Handlers) {}

  connect() {
    this.closed = false;
    this.open();
  }

  private open() {
    if (this.closed) return;
    this.handlers.onConnection(this.attempts === 0 ? "connecting" : "offline");

    let socket: WebSocket;
    try {
      socket = new WebSocket(endpoint());
    } catch {
      this.scheduleRetry();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      this.attempts = 0;
      this.handlers.onConnection("online");
      // Re-present a fresh ticket after every reconnect.
      if (this.identity) void this.sendHello();
    };

    socket.onmessage = (event) => {
      try {
        this.handlers.onMessage(JSON.parse(String(event.data)) as ServerMessage);
      } catch {
        /* ignore anything we cannot parse */
      }
    };

    socket.onclose = () => {
      this.socket = null;
      if (!this.closed) {
        this.handlers.onConnection("offline");
        this.scheduleRetry();
      }
    };

    socket.onerror = () => socket.close();
  }

  private scheduleRetry() {
    if (this.retry) clearTimeout(this.retry);
    const delay = Math.min(1000 * 2 ** this.attempts, 15_000);
    this.attempts += 1;
    this.retry = setTimeout(() => this.open(), delay);
  }

  identify(gender: Gender, preference: Preference) {
    this.identity = { gender, preference };
    void this.sendHello();
  }

  private async sendHello() {
    if (!this.identity) return;
    const ticket = await fetchTicket();
    if (!ticket) {
      // The session is gone. The pages are gated, so this means it expired.
      this.handlers.onMessage({ t: "error", code: "unauthenticated" });
      return;
    }
    this.send({ t: "hello", ticket, ...this.identity });
  }

  send(message: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  close() {
    this.closed = true;
    if (this.retry) clearTimeout(this.retry);
    this.socket?.close();
    this.socket = null;
  }
}
