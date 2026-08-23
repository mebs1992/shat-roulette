import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Marks the user as currently shitting, so friends can see it. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  await (await db()).prepare("UPDATE users SET shitting_since = ? WHERE id = ?").bind(Date.now(), user.id).run();
  return NextResponse.json({ ok: true });
}
