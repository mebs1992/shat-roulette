import { NextResponse } from "next/server";
import { currentUser, newId } from "@/lib/auth";
import { db } from "@/lib/db";

type EndBody = {
  startedAt?: number;
  shitmates?: number;
  messages?: number;
  /** Countries of the people met, so the profile can count them. */
  countries?: string[];
  /** The user's own local date (YYYY-MM-DD), so streaks are fair across timezones. */
  day?: string;
};

const DAY_MS = 86_400_000;

function previousDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return new Date(date.getTime() - DAY_MS).toISOString().slice(0, 10);
}

/** Records a finished shit and rolls the user's lifetime counters forward. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = ((await request.json().catch(() => ({}))) ?? {}) as EndBody;
  const startedAt = Number(body.startedAt);
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return NextResponse.json({ error: "Bad start time." }, { status: 400 });
  }

  const endedAt = Date.now();
  // Clamp: a phone asleep for six hours should not mint a record shit.
  const duration = Math.max(0, Math.min(endedAt - startedAt, 4 * 3_600_000));
  const shitmates = Math.max(0, Math.min(Number(body.shitmates ?? 0), 500));
  const messages = Math.max(0, Math.min(Number(body.messages ?? 0), 10_000));
  const day = /^\d{4}-\d{2}-\d{2}$/.test(body.day ?? "")
    ? (body.day as string)
    : new Date().toISOString().slice(0, 10);

  const database = await db();

  // Streaks: same day is a no-op, yesterday extends, anything older restarts.
  let streak = user.streak_days;
  if (user.last_shit_day !== day) {
    streak = user.last_shit_day === previousDay(day) ? user.streak_days + 1 : 1;
  }
  const longestStreak = Math.max(user.longest_streak, streak);

  const statements = [
    database
      .prepare(
        `INSERT INTO shit_sessions (id, user_id, started_at, ended_at, duration_ms, shitmates, messages, country)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(newId(), user.id, startedAt, endedAt, duration, shitmates, messages, user.country),
    database
      .prepare(
        `UPDATE users SET
           total_shits     = total_shits + 1,
           total_shit_ms   = total_shit_ms + ?,
           longest_shit_ms = MAX(longest_shit_ms, ?),
           total_shitmates = total_shitmates + ?,
           streak_days     = ?,
           longest_streak  = ?,
           last_shit_day   = ?,
           shitting_since  = NULL
         WHERE id = ?`,
      )
      .bind(duration, duration, shitmates, streak, longestStreak, day, user.id),
  ];

  for (const country of (body.countries ?? []).slice(0, 50)) {
    if (!/^[A-Z]{2}$/.test(country)) continue;
    statements.push(
      database
        .prepare("INSERT OR IGNORE INTO countries_met (user_id, country, met_at) VALUES (?, ?, ?)")
        .bind(user.id, country, endedAt),
    );
  }

  await database.batch(statements);

  return NextResponse.json({
    durationMs: duration,
    streakDays: streak,
    longestStreak,
    personalBest: duration >= user.longest_shit_ms && duration > 0,
  });
}
