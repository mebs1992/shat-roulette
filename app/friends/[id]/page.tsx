import { redirect } from "next/navigation";
import { FriendProfileScreen } from "@/components/FriendProfileScreen";
import { currentUser } from "@/lib/auth";
import { friendStats } from "@/lib/friend-stats";

export default async function FriendProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");

  const { id } = await params;
  const data = await friendStats(user.id, id);
  // Not an accepted friend (or no such person). Don't confirm the difference —
  // just send them back to their own friends list.
  if (!data) redirect("/friends");

  return <FriendProfileScreen data={data} />;
}
