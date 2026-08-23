import { redirect } from "next/navigation";
import { ConfirmScreen } from "@/components/ConfirmScreen";
import { currentUser } from "@/lib/auth";

export default async function ConfirmPage() {
  // First gated step: everything past here needs an account.
  if (!(await currentUser())) redirect("/join");
  return <ConfirmScreen />;
}
