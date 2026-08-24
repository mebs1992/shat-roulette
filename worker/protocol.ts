/** Wire protocol shared by the worker and the browser client. */

export type Gender = "man" | "woman" | "nonbinary";
export type Preference = "anyone" | "man" | "woman" | "nonbinary";

export type PartnerInfo = {
  /** Shown as "Shitmate #48391". Not stable across sessions — that is the point. */
  num: number;
  country: string;
  gender: Gender;
  /** Server clock. Compare against `serverNow`, never the device clock. */
  shitStartedAt: number;
};

/** Browser → worker. */
export type ClientMessage =
  | { t: "hello"; ticket: string; gender: Gender; preference: Preference }
  | { t: "queue" }
  | { t: "cancel" }
  | { t: "msg"; text: string }
  | { t: "img"; data: string }
  | { t: "typing"; on: boolean }
  | { t: "joinRoom"; roomId: string }
  | { t: "leave" }
  | { t: "block" }
  | { t: "report"; reason?: string };

/** Worker → browser. */
export type ServerMessage
  = { t: "welcome"; num: number; country: string; online: number; serverNow: number }
  | { t: "identified"; num: number }
  | { t: "waiting"; queued: number }
  | { t: "matched"; partner: PartnerInfo; serverNow: number; friendToken: string; direct?: boolean }
  | { t: "roomGone" }
  | { t: "msg"; text: string; at: number }
  | { t: "img"; data: string; at: number }
  | { t: "typing"; on: boolean }
  | { t: "left"; reason: "leave" | "disconnect" }
  | { t: "online"; count: number }
  | { t: "error"; code: "rate_limited" | "too_long" | "too_big" | "bad_image" | "not_paired" | "bad_message" | "unauthenticated" | "banned" };

export const MAX_MESSAGE_LENGTH = 500;
/** Messages allowed per RATE_WINDOW_MS. Generous for a human, useless for a script. */
export const RATE_LIMIT = 12;
export const RATE_WINDOW_MS = 10_000;

/**
 * Max length of an image data URL, in characters. Cloudflare relays WebSocket
 * frames up to ~1 MiB; base64 inflates bytes by ~4/3, so this cap keeps a
 * relayed image comfortably under that with headroom. The browser downscales
 * and re-encodes before sending, so real photos land far below this.
 * Images are NEVER stored — they pass through the room in memory and are gone
 * the moment the chat ends.
 */
export const MAX_IMAGE_CHARS = 320_000;
/** Data URLs we relay. Anything else is rejected before it reaches a partner. */
export const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
