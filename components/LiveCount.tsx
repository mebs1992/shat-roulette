"use client";

import { useSession } from "@/lib/session";

/**
 * People actually connected right now, straight from the lobby. Falls back to
 * a dash until the socket is up, rather than inventing a number.
 */
export function LiveCount({ fallback = "—" }: { fallback?: string }) {
  const { online, connection } = useSession();
  if (connection !== "online") return <>{fallback}</>;
  return <>{online.toLocaleString("en-US")}</>;
}
