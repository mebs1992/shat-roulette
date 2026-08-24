import { db } from "./db";
import { publicName } from "./auth";
import { formatDuration, formatTotal } from "./format";
import { presenceOf, type Presence } from "./friends";

/**
 * A friend's stats, as they are allowed to be seen by another friend. Aggregate
 * counts only — no chat content, no who they met, nothing a friend couldn't
 * already infer. Shown only to an *accepted* friend; strangers get nothing.
 */
export type FriendStats = {
  id: string;
  publicName: string;
  shitmateNum: number;
  username: string;
  country: string | null;
  joined: string;
  presence: Presence;
  totalShitmates: number;
  totalShitLabel: string;
  longestShitLabel: string;
  streakDays: number;
  longestStreak: number;
  countries: string[];
};

type Row = {
  id: string;
  username: string;
  shitmate_num: number;
  country: string | null;
  created_at: number;
  total_shit_ms: number;
  longest_shit_ms: number;
  total_shitmates: number;
  streak_days: number;
  longest_streak: number;
  shitting_since: number | null;
  last_seen: number | null;
};

/**
 * Loads a friend's viewable stats, but only if `viewerId` and `targetId` are
 * accepted friends in both directions. Returns null otherwise — a non-friend,
 * a pending request, or a stranger poking at the URL all get the same nothing.
 */
export async function friendStats(viewerId: string, targetId: string): Promise<FriendStats | null> {
  if (!targetId || viewerId === targetId) return null;

  const database = await db();

  // Both rows must exist and be accepted. Accepting writes both, so a single
  // 'accepted' row from the viewer already implies mutual consent, but we check
  // both directions to be safe against any half-written state.
  const bond = await database
    .prepare(
      `SELECT
         (SELECT status FROM friendships WHERE user_id = ?1 AND friend_id = ?2) AS mine,
         (SELECT status FROM friendships WHERE user_id = ?2 AND friend_id = ?1) AS theirs`,
    )
    .bind(viewerId, targetId)
    .first<{ mine: string | null; theirs: string | null }>();

  if (!bond || bond.mine !== "accepted" || bond.theirs !== "accepted") return null;

  const row = await database
    .prepare(
      `SELECT id, username, shitmate_num, country, created_at,
              total_shit_ms, longest_shit_ms, total_shitmates,
              streak_days, longest_streak, shitting_since, last_seen
         FROM users WHERE id = ?`,
    )
    .bind(targetId)
    .first<Row>();

  if (!row) return null;

  const met = await database
    .prepare("SELECT country FROM countries_met WHERE user_id = ? ORDER BY met_at DESC")
    .bind(targetId)
    .all<{ country: string }>();

  return {
    id: row.id,
    publicName: publicName(row),
    shitmateNum: row.shitmate_num,
    username: row.username,
    country: row.country,
    joined: new Date(row.created_at)
      .toLocaleString("en-GB", { month: "short", year: "numeric" })
      .toUpperCase(),
    presence: presenceOf(row.shitting_since, row.last_seen),
    totalShitmates: row.total_shitmates,
    totalShitLabel: formatTotal(row.total_shit_ms),
    longestShitLabel: row.longest_shit_ms ? formatDuration(row.longest_shit_ms) : "—",
    streakDays: row.streak_days,
    longestStreak: row.longest_streak,
    countries: (met.results ?? []).map((r) => r.country),
  };
}
