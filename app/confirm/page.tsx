import { redirect } from "next/navigation";
import { ConfirmScreen } from "@/components/ConfirmScreen";
import { currentUser } from "@/lib/auth";

export default async function ConfirmPage() {
  // First gated step: everything past here needs an account.
  const user = await currentUser();
  if (!user) redirect("/join");
  if (user.banned_at != null) redirect("/banned");
  return <ConfirmScreen />;
}
