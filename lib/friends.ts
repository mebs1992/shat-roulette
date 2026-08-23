import { db } from "./db";

/** Presence goes stale rather than sticking forever if an end call is missed. */
export const SHITTING_WINDOW_MS = 4 * 3_600_000;
/** How recently the app must have been open to count as around. */
export const AVAILABLE_WINDOW_MS = 5 * 60_000;

/** Shitting beats available beats offline. */
export type Presence = "shitting" | "available" | "offline";

export type Friend = {
  id: string;
  username: string;
  shitmateNum: number;
  country: string | null;
  presence: Presence;
  streakDays: number;
  /** "accepted" both ways, "pending" from you, or "incoming" awaiting your answer. */
  state: "accepted" | "pending" | "incoming";
};

type Row = {
  id: string;
  username: string;
  shitmate_num: number;
  country: string | null;
  shitting_since: number | null;
  last_seen: number | null;
  streak_days: number;
  state: string;
};

export function presenceOf(shittingSince: number | null, lastSeen: number | null, now = Date.now()): Presence {
  if (shittingSince !== null && shittingSince > now - SHITTING_WINDOW_MS) return "shitting";
  if (lastSeen !== null && lastSeen > now - AVAILABLE_WINDOW_MS) return "available";
  return "offline";
}

export async function listFriends(userId: string): Promise<Friend[]> {
  const now = Date.now();
  const cutoff = now - SHITTING_WINDOW_MS;

  const rows = await (await db())
    .prepare(
      `SELECT u.id, u.username, u.shitmate_num, u.country, u.shitting_since, u.last_seen, u.streak_days,
              CASE
                WHEN mine.status = 'accepted' THEN 'accepted'
                WHEN mine.status = 'pending'  THEN 'pending'
                ELSE 'incoming'
              END AS state
         FROM users u
         LEFT JOIN friendships mine  ON mine.user_id = ?1 AND mine.friend_id = u.id
         LEFT JOIN friendships their ON their.user_id = u.id AND their.friend_id = ?1
        WHERE mine.user_id IS NOT NULL OR their.user_id IS NOT NULL
        ORDER BY (u.shitting_since IS NOT NULL AND u.shitting_since > ?2) DESC,
                 (u.last_seen IS NOT NULL AND u.last_seen > ?3) DESC,
                 u.username`,
    )
    .bind(userId, cutoff, now - AVAILABLE_WINDOW_MS)
    .all<Row>();

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    shitmateNum: row.shitmate_num,
    country: row.country,
    presence: presenceOf(row.shitting_since, row.last_seen, now),
    streakDays: row.streak_days,
    state: row.state as Friend["state"],
  }));
}
