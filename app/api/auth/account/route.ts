import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, destroySession, publicName } from "@/lib/auth";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      shitmateNum: user.shitmate_num,
      publicName: publicName(user),
      avatar: user.avatar,
      country: user.country,
      totalShits: user.total_shits,
      totalShitMs: user.total_shit_ms,
      longestShitMs: user.longest_shit_ms,
      totalShitmates: user.total_shitmates,
      streakDays: user.streak_days,
      longestStreak: user.longest_streak,
    },
  });
}

/** Account deletion. Sessions and oauth links cascade; nothing else refers to a user yet. */
export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await (await db()).prepare("DELETE FROM users WHERE id = ?").bind(user.id).run();
  await destroySession();
  return NextResponse.json({ ok: true });
}
