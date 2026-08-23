/**
 * Lobby tickets.
 *
 * The app and the lobby are separate Workers on separate hostnames, so the
 * session cookie never reaches the lobby. Instead the app mints a short-lived
 * ticket signed with a shared secret, and the lobby verifies it with no
 * database access at all.
 *
 * Runs unchanged in both runtimes: WebCrypto only.
 */

export type TicketPayload = {
  /** Account id. The identity blocks and stats hang off. */
  u: string;
  /** Public shitmate number. */
  n: number;
  /** Expiry, epoch ms. */
  exp: number;
};

export const TICKET_TTL_MS = 5 * 60_000;

/** How long after a chat you can still add the person you met. */
export const FRIEND_TOKEN_TTL_MS = 6 * 60 * 60_000;

export type FriendTokenPayload = {
  /** The account the token was issued to. */
  me: string;
  /** The account they were talking to. */
  them: string;
  /** Their public number, so the app can show who the request is from. */
  n: number;
  exp: number;
};

/**
 * Used only when LOBBY_TICKET_SECRET is unset, which must never be the case in
 * production — see the launch checklist in the README. Both sides log when
 * they fall back to it.
 */
export const DEV_SECRET = "dev-only-lobby-secret-set-LOBBY_TICKET_SECRET-before-launch";

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Proof that two accounts were matched with each other. Without this the app
 * would have to take the client's word for who it just met, which would let
 * anyone add any account they could name.
 */
export async function mintFriendToken(payload: FriendTokenPayload, secret: string): Promise<string> {
  return mintTicket(payload as unknown as TicketPayload, secret);
}

export async function readFriendToken(token: string, secret: string): Promise<FriendTokenPayload | null> {
  const [body, signature] = String(token ?? "").split(".");
  if (!body || !signature) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await key(secret),
      fromBase64url(signature) as BufferSource,
      new TextEncoder().encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as FriendTokenPayload;
    if (typeof payload.me !== "string" || typeof payload.them !== "string") return null;
    if (!(payload.exp > Date.now())) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function mintTicket(payload: TicketPayload, secret: string): Promise<string> {
  const body = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await key(secret), new TextEncoder().encode(body));
  return `${body}.${base64url(new Uint8Array(signature))}`;
}

/** Returns the payload, or null for anything malformed, mis-signed or expired. */
export async function readTicket(ticket: string, secret: string): Promise<TicketPayload | null> {
  const [body, signature] = String(ticket ?? "").split(".");
  if (!body || !signature) return null;

  let valid: boolean;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await key(secret),
      fromBase64url(signature) as BufferSource,
      new TextEncoder().encode(body),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as TicketPayload;
    if (typeof payload.u !== "string" || typeof payload.n !== "number") return null;
    if (!(payload.exp > Date.now())) return null;
    return payload;
  } catch {
    return null;
  }
}
