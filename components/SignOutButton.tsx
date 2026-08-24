"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn--ghost"
      style={{ minHeight: 52, padding: "0 28px" }}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      SIGN OUT
    </button>
  );
}
