import { GlobalScreen } from "@/components/GlobalScreen";
import { currentUser } from "@/lib/auth";
import { leaderboard } from "@/lib/leaderboard";

export default async function GlobalPage() {
  // Readable signed out too — it is the pitch for what the app is.
  const user = await currentUser();
  return <GlobalScreen board={await leaderboard(user?.id ?? null)} />;
}
