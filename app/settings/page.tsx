import { redirect } from "next/navigation";
import { SettingsScreen } from "@/components/SettingsScreen";
import { currentUser, publicName } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  return <SettingsScreen username={user.username} email={user.email} publicName={publicName(user)} />;
}
