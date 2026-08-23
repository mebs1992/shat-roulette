import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/csrf";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Accepts an incoming request from someone you were matched with. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Bad request." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const other = body?.id;
  if (!other) return NextResponse.json({ error: "Which request?" }, { status: 400 });

  const database = await db();

  // Only a request that actually exists can be accepted.
  const incoming = await database
    .prepare("SELECT status FROM friendships WHERE user_id = ? AND friend_id = ? AND status = 'pending'")
    .bind(other, user.id)
    .first<{ status: string }>();
  if (!incoming) return NextResponse.json({ error: "No such request." }, { status: 404 });

  const now = Date.now();
  await database.batch([
    database
      .prepare("UPDATE friendships SET status = 'accepted' WHERE user_id = ? AND friend_id = ?")
      .bind(other, user.id),
    database
      .prepare(
        `INSERT INTO friendships (user_id, friend_id, status, created_at) VALUES (?, ?, 'accepted', ?)
         ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'accepted'`,
      )
      .bind(user.id, other, now),
  ]);

  return NextResponse.json({ ok: true });
}
