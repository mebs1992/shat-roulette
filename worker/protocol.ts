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
  | { t: "hello"; deviceId: string; gender: Gender; preference: Preference; shitStartedAt: number }
  | { t: "queue" }
  | { t: "cancel" }
  | { t: "msg"; text: string }
  | { t: "typing"; on: boolean }
  | { t: "leave" }
  | { t: "block" }
  | { t: "report"; reason?: string };

/** Worker → browser. */
export type ServerMessage
  = { t: "welcome"; num: number; country: string; online: number; serverNow: number }
  | { t: "waiting"; queued: number }
  | { t: "matched"; partner: PartnerInfo; serverNow: number }
  | { t: "msg"; text: string; at: number }
  | { t: "typing"; on: boolean }
  | { t: "left"; reason: "leave" | "disconnect" }
  | { t: "online"; count: number }
  | { t: "error"; code: "rate_limited" | "too_long" | "not_paired" | "bad_message" };

export const MAX_MESSAGE_LENGTH = 500;
/** Messages allowed per RATE_WINDOW_MS. Generous for a human, useless for a script. */
export const RATE_LIMIT = 12;
export const RATE_WINDOW_MS = 10_000;
