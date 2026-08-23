import { redirect } from "next/navigation";
import { StatsScreen, type StatsData } from "@/components/StatsScreen";
import { currentUser, publicName } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDuration, formatTotal } from "@/lib/format";

export default async function StatsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const met = await (await db())
    .prepare("SELECT country FROM countries_met WHERE user_id = ? ORDER BY met_at DESC")
    .bind(user.id)
    .all<{ country: string }>();

  const data: StatsData = {
    publicName: publicName(user),
    username: user.username,
    country: user.country,
    joined: new Date(user.created_at)
      .toLocaleString("en-GB", { month: "short", year: "numeric" })
      .toUpperCase(),
    totalShitmates: user.total_shitmates,
    totalShitLabel: formatTotal(user.total_shit_ms),
    longestShitLabel: user.longest_shit_ms ? formatDuration(user.longest_shit_ms) : "—",
    streakDays: user.streak_days,
    longestStreak: user.longest_streak,
    countries: (met.results ?? []).map((row) => row.country),
  };

  return <StatsScreen data={data} />;
}
