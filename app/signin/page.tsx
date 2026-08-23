import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { currentUser } from "@/lib/auth";

export default async function SignInPage() {
  if (await currentUser()) redirect("/confirm");
  return <AuthForm mode="signin" />;
}
