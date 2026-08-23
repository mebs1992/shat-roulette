import { redirect } from "next/navigation";
import { FriendsScreen } from "@/components/FriendsScreen";
import { currentUser } from "@/lib/auth";
import { listFriends } from "@/lib/friends";

export default async function FriendsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  return <FriendsScreen friends={await listFriends(user.id)} />;
}
