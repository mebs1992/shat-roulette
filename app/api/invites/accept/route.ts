import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { sameOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";

/** Accept a pending invite; returns the room id to join. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Bad request." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ error: "Which invite?" }, { status: 400 });

  const invite = await (await db())
    .prepare("SELECT room_id FROM invites WHERE id = ? AND to_id = ? AND status = 'pending'")
    .bind(body.id, user.id)
    .first<{ room_id: string }>();
  if (!invite) return NextResponse.json({ error: "That invite is gone." }, { status: 404 });

  await (await db()).prepare("UPDATE invites SET status = 'accepted' WHERE id = ?").bind(body.id).run();
  return NextResponse.json({ roomId: invite.room_id });
}
