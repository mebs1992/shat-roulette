import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Heartbeat. Called while the app is open so friends can see who is around,
 * not merely who is mid-shit.
 */
export async function POST() {
  const user = await currentUser();
  // Signed out is not an error here; the heartbeat runs for everyone.
  if (!user) return NextResponse.json({ ok: false });

  await (await db()).prepare("UPDATE users SET last_seen = ? WHERE id = ?").bind(Date.now(), user.id).run();
  return NextResponse.json({ ok: true });
}
