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

const DEVICE_KEY = "shat-roulette/device";

/** Anonymous, per-device, and the only thing tying a person to a ban. */
export function deviceId(): string {
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
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
  private identity: Extract<ClientMessage, { t: "hello" }> | null = null;

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
      if (this.identity) this.send(this.identity);
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

  identify(gender: Gender, preference: Preference, shitStartedAt: number) {
    this.identity = { t: "hello", deviceId: deviceId(), gender, preference, shitStartedAt };
    this.send(this.identity);
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
