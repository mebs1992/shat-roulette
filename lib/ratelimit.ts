import { db } from "./db";

export type Limit = { limit: number; windowMs: number };

/** Tuned for humans, ruinous for scripts. */
export const LOGIN_LIMIT: Limit = { limit: 8, windowMs: 10 * 60_000 };
export const SIGNUP_LIMIT: Limit = { limit: 10, windowMs: 60 * 60_000 };

/**
 * The caller's IP, from Cloudflare's own header. Spoofing it past the edge is
 * not possible; a missing value (local dev) collapses everyone to one bucket,
 * which is fine — it only over-limits, never under.
 */
export function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Fixed-window counter. Returns true when the action is allowed, false when the
 * window's budget is spent. Fails OPEN on a database error — a limiter that
 * takes the site down when the DB hiccups is its own denial of service.
 */
export async function rateLimit(action: string, ip: string, { limit, windowMs }: Limit): Promise<boolean> {
  const now = Date.now();
  const bucket = `${action}:${ip}:${Math.floor(now / windowMs)}`;
  const expiresAt = now + windowMs;

  try {
    const database = await db();
    const row = await database
      .prepare(
        `INSERT INTO rate_limits (bucket, count, expires_at) VALUES (?, 1, ?)
         ON CONFLICT(bucket) DO UPDATE SET count = count + 1
         RETURNING count`,
      )
      .bind(bucket, expiresAt)
      .first<{ count: number }>();

    // Opportunistic sweep, ~2% of the time, so the table cannot grow forever.
    if (Math.random() < 0.02) {
      await database.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(now).run();
    }

    return (row?.count ?? 1) <= limit;
  } catch {
    return true;
  }
}
