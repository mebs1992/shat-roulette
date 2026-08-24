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

/**
 * What a username search hands back. Deliberately thin: a name, a public number,
 * and where you already stand with them. No presence, no stats, no email — a
 * stranger in your search results is still a stranger.
 */
export type SearchResult = {
  id: string;
  username: string;
  shitmateNum: number;
  /** "none" (add them), "pending" (you asked), "incoming" (they asked), "accepted". */
  state: "none" | "pending" | "incoming" | "accepted";
};

/** Escapes LIKE wildcards so a username with an underscore matches literally. */
function likeLiteral(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Finds accounts whose username starts with `query`. Prefix-only and capped, so
 * it helps you find a friend you already know without becoming a directory to
 * scrape. Excludes you and the banned. Returns [] for a too-short query.
 */
export async function searchUsers(viewerId: string, query: string): Promise<SearchResult[]> {
  const clean = query.trim().replace(/[^a-zA-Z0-9_]/g, "");
  if (clean.length < 2) return [];

  const rows = await (await db())
    .prepare(
      `SELECT u.id, u.username, u.shitmate_num,
              mine.status  AS mine,
              their.status AS theirs
         FROM users u
         LEFT JOIN friendships mine  ON mine.user_id = ?1 AND mine.friend_id = u.id
         LEFT JOIN friendships their ON their.user_id = u.id AND their.friend_id = ?1
        WHERE u.id <> ?1
          AND u.banned_at IS NULL
          AND u.username LIKE ?2 ESCAPE '\\'
        ORDER BY (u.username = ?3) DESC, length(u.username), u.username
        LIMIT 10`,
    )
    .bind(viewerId, `${likeLiteral(clean)}%`, clean)
    .all<{ id: string; username: string; shitmate_num: number; mine: string | null; theirs: string | null }>();

  return (rows.results ?? []).map((row) => {
    let state: SearchResult["state"] = "none";
    if (row.mine === "accepted" || row.theirs === "accepted") state = "accepted";
    else if (row.mine === "pending") state = "pending";
    else if (row.theirs === "pending") state = "incoming";
    return { id: row.id, username: row.username, shitmateNum: row.shitmate_num, state };
  });
}

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
