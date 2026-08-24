import { redirect } from "next/navigation";
import { Mark } from "@/components/Mark";
import { currentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

export default async function BannedPage() {
  const user = await currentUser();
  if (!user) redirect("/join");
  if (user.banned_at == null) redirect("/");

  return (
    <main className="screen" style={{ alignItems: "center", justifyContent: "center", gap: 22 }}>
      <Mark size={72} color="var(--clay)" />
      <h1 className="display" style={{ margin: 0, fontSize: 40, textAlign: "center" }}>
        You&apos;ve been
        <br />
        flushed.
      </h1>
      <p style={{ margin: 0, maxWidth: 300, textAlign: "center", fontSize: 15, lineHeight: 1.5, color: "var(--muted)" }}>
        Enough people reported this account that it can no longer be matched with anyone. That&apos;s the end of the road.
      </p>
      <div style={{ marginTop: 8 }}>
        <SignOutButton />
      </div>
    </main>
  );
}
