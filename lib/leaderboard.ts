import { db } from "./db";
import { SHITTING_WINDOW_MS } from "./friends";

/** Boards reset at midnight UTC, which is what the screen claims. */
function startOfDayUTC(now = Date.now()): number {
  return Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate(),
  );
}

export type BoardRow = {
  /** Public number only — never a username. Strangers stay strangers. */
  shitmateNum: number;
  country: string | null;
  value: string;
  meta: string;
  isYou: boolean;
};

export type CountryRow = { code: string; count: number; pct: number; isYours: boolean };

export type Leaderboard = {
  shittingNow: number;
  /** Shits started per hour over the last twelve, oldest first. Real counts. */
  trend: number[];
  longest: BoardRow[];
  shitmates: BoardRow[];
  streaks: BoardRow[];
  countries: CountryRow[];
  yourRank: { longest: number | null; shitmates: number | null };
};

function duration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function finishedAt(endedAt: number): string {
  const date = new Date(endedAt);
  return `FINISHED ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export async function leaderboard(userId: string | null): Promise<Leaderboard> {
  const now = Date.now();
  const dayStart = startOfDayUTC(now);
  const shittingCutoff = now - SHITTING_WINDOW_MS;
  const database = await db();

  const twelveHoursAgo = now - 12 * 3_600_000;

  const [live, longestRows, mateRows, streakRows, countryRows, trendRows] = await database.batch([
    database
      .prepare("SELECT COUNT(*) AS n FROM users WHERE shitting_since IS NOT NULL AND shitting_since > ?")
      .bind(shittingCutoff),
    database
      .prepare(
        `SELECT s.user_id, s.duration_ms, s.ended_at, u.shitmate_num, u.country, u.shitting_since
           FROM shit_sessions s JOIN users u ON u.id = s.user_id
          WHERE s.started_at >= ?
          ORDER BY s.duration_ms DESC LIMIT 20`,
      )
      .bind(dayStart),
    database
      .prepare(
        `SELECT s.user_id, SUM(s.shitmates) AS mates, u.shitmate_num, u.country
           FROM shit_sessions s JOIN users u ON u.id = s.user_id
          WHERE s.started_at >= ?
          GROUP BY s.user_id HAVING mates > 0
          ORDER BY mates DESC LIMIT 20`,
      )
      .bind(dayStart),
    database
      .prepare(
        `SELECT id, shitmate_num, country, streak_days FROM users
          WHERE streak_days > 0 ORDER BY streak_days DESC LIMIT 20`,
      ),
    database
      .prepare(
        `SELECT country, COUNT(*) AS n FROM users
          WHERE shitting_since IS NOT NULL AND shitting_since > ? AND country IS NOT NULL
          GROUP BY country ORDER BY n DESC LIMIT 6`,
      )
      .bind(shittingCutoff),
    database
      .prepare(
        `SELECT CAST((started_at - ?1) / 3600000 AS INTEGER) AS bucket, COUNT(*) AS n
           FROM shit_sessions WHERE started_at >= ?1
          GROUP BY bucket`,
      )
      .bind(twelveHoursAgo),
  ]);

  // Twelve hourly buckets, zero-filled — a missing hour is a real zero.
  const trend = Array.from({ length: 12 }, () => 0);
  for (const row of (trendRows.results as { bucket: number; n: number }[]) ?? []) {
    if (row.bucket >= 0 && row.bucket < 12) trend[row.bucket] = row.n;
  }

  const shittingNow = (live.results as { n: number }[])[0]?.n ?? 0;

  const longest: BoardRow[] = (longestRows.results as {
    user_id: string; duration_ms: number; ended_at: number; shitmate_num: number; country: string | null; shitting_since: number | null;
  }[]).map((row) => ({
    shitmateNum: row.shitmate_num,
    country: row.country,
    value: duration(row.duration_ms),
    meta: row.shitting_since && row.shitting_since > shittingCutoff ? "STILL IN THERE" : finishedAt(row.ended_at),
    isYou: row.user_id === userId,
  }));

  const shitmates: BoardRow[] = (mateRows.results as {
    user_id: string; mates: number; shitmate_num: number; country: string | null;
  }[]).map((row) => ({
    shitmateNum: row.shitmate_num,
    country: row.country,
    value: String(row.mates),
    meta: row.mates === 1 ? "1 SHITMATE" : `${row.mates} SHITMATES`,
    isYou: row.user_id === userId,
  }));

  const streaks: BoardRow[] = (streakRows.results as {
    id: string; shitmate_num: number; country: string | null; streak_days: number;
  }[]).map((row) => ({
    shitmateNum: row.shitmate_num,
    country: row.country,
    value: `${row.streak_days}D`,
    meta: row.streak_days === 1 ? "1 DAY RUNNING" : `${row.streak_days} DAYS RUNNING`,
    isYou: row.id === userId,
  }));

  const counts = (countryRows.results as { country: string; n: number }[]) ?? [];
  const top = counts[0]?.n ?? 1;
  const yourCountry = longest.find((row) => row.isYou)?.country ?? null;
  const countries: CountryRow[] = counts.map((row) => ({
    code: row.country,
    count: row.n,
    pct: Math.max(6, Math.round((row.n / top) * 100)),
    isYours: row.country === yourCountry,
  }));

  const rankOf = (rows: BoardRow[]) => {
    const index = rows.findIndex((row) => row.isYou);
    return index === -1 ? null : index + 1;
  };

  return {
    shittingNow,
    trend,
    longest: longest.slice(0, 5),
    shitmates: shitmates.slice(0, 5),
    streaks: streaks.slice(0, 5),
    countries,
    yourRank: { longest: rankOf(longest), shitmates: rankOf(shitmates) },
  };
}
