import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentUser } from "@/lib/auth";

export default async function JoinPage() {
  if (await currentUser()) redirect("/confirm");
  return <AuthForm mode="join" />;
}
