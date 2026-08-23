import { db } from "./db";

/** Presence goes stale rather than sticking forever if an end call is missed. */
export const SHITTING_WINDOW_MS = 4 * 3_600_000;

export type Friend = {
  id: string;
  username: string;
  shitmateNum: number;
  country: string | null;
  shittingNow: boolean;
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
  streak_days: number;
  state: string;
};

export async function listFriends(userId: string): Promise<Friend[]> {
  const cutoff = Date.now() - SHITTING_WINDOW_MS;

  const rows = await (await db())
    .prepare(
      `SELECT u.id, u.username, u.shitmate_num, u.country, u.shitting_since, u.streak_days,
              CASE
                WHEN mine.status = 'accepted' THEN 'accepted'
                WHEN mine.status = 'pending'  THEN 'pending'
                ELSE 'incoming'
              END AS state
         FROM users u
         LEFT JOIN friendships mine  ON mine.user_id = ?1 AND mine.friend_id = u.id
         LEFT JOIN friendships their ON their.user_id = u.id AND their.friend_id = ?1
        WHERE mine.user_id IS NOT NULL OR their.user_id IS NOT NULL
        ORDER BY (u.shitting_since IS NOT NULL AND u.shitting_since > ?2) DESC, u.username`,
    )
    .bind(userId, cutoff)
    .all<Row>();

  return (rows.results ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    shitmateNum: row.shitmate_num,
    country: row.country,
    shittingNow: row.shitting_since !== null && row.shitting_since > cutoff,
    streakDays: row.streak_days,
    state: row.state as Friend["state"],
  }));
}
