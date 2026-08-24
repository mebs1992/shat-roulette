import { cookies } from "next/headers";
import { db } from "./db";

export const SESSION_COOKIE = "sr_session";
const SESSION_DAYS = 60;

/**
 * PBKDF2 — the Workers runtime has no bcrypt or argon2 without shipping WASM.
 *
 * The iteration count is capped by the platform, not by taste: the Workers
 * Free plan allows 10ms of CPU per request, and 210k iterations costs ~32ms,
 * which kills the request outright. 25k costs ~4ms and leaves room for the
 * rest of the handler.
 *
 * That is weaker than the ~600k OWASP recommends. Raise this the moment the
 * account moves to the Workers Paid plan (30s CPU) — old hashes keep working,
 * because each one records the count it was made with.
 */
const PBKDF2_ITERATIONS = 25_000;

export type User = {
  id: string;
  username: string;
  shitmate_num: number;
  email: string | null;
  avatar: string;
  country: string | null;
  created_at: number;
  total_shits: number;
  total_shit_ms: number;
  longest_shit_ms: number;
  total_shitmates: number;
  streak_days: number;
  longest_streak: number;
  last_shit_day: string | null;
  banned_at: number | null;
};

function randomHex(bytes: number): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newId(): string {
  return randomHex(16);
}

async function pbkdf2(password: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt, (b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2$${PBKDF2_ITERATIONS}$${saltHex}$${await pbkdf2(password, salt)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, saltHex, expected] = stored.split("$");
  if (scheme !== "pbkdf2" || !saltHex || !expected) return false;

  // Verify with the count this hash was created with, not the current default.
  // Otherwise changing PBKDF2_ITERATIONS silently locks out every account.
  const rounds = Number(iterations);
  if (!Number.isInteger(rounds) || rounds <= 0) return false;

  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const actual = await pbkdf2(password, salt, rounds);
  // Constant-time-ish: compare every character regardless of mismatch.
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function createSession(userId: string): Promise<string> {
  const id = randomHex(32);
  const now = Date.now();
  const expires = now + SESSION_DAYS * 86_400_000;
  await (await db())
    .prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(id, userId, now, expires)
    .run();

  (await cookies()).set(SESSION_COOKIE, id, {
    httpOnly: true,
    // Secure in production, but not in development: Safari drops Secure
    // cookies on a plain-http LAN address, which silently breaks phone testing
    // against the dev server.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return id;
}

export async function currentUser(): Promise<User | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;

  // Explicit columns, never SELECT *: the password hash must not ride along on
  // an object that server components pass around. Login reads it on its own.
  const row = await (await db())
    .prepare(
      `SELECT u.id, u.username, u.shitmate_num, u.email, u.avatar, u.country, u.created_at,
              u.total_shits, u.total_shit_ms, u.longest_shit_ms, u.total_shitmates,
              u.streak_days, u.longest_streak, u.last_shit_day, u.banned_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id = ? AND s.expires_at > ?`,
    )
    .bind(id, Date.now())
    .first<User>();
  return row ?? null;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) {
    await (await db()).prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
  }
  jar.delete(SESSION_COOKIE);
}

/** Public identity for strangers. Usernames are for friends only. */
export function publicName(user: Pick<User, "shitmate_num">): string {
  return `Shitmate #${user.shitmate_num}`;
}

export function validateUsername(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 3) return "Username needs at least 3 characters.";
  if (trimmed.length > 20) return "Username must be 20 characters or fewer.";
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return "Letters, numbers and underscores only.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password needs at least 8 characters.";
  if (password.length > 200) return "That password is unreasonably long.";
  return null;
}

export function validateEmail(email: string): string | null {
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email.trim())) return "That doesn't look like an email address.";
  return null;
}
