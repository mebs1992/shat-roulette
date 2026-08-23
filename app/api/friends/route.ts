import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/csrf";
import { currentUser } from "@/lib/auth";
import { db, env } from "@/lib/db";
import { listFriends } from "@/lib/friends";
import { readFriendToken } from "@/shared/ticket";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ friends: await listFriends(user.id) });
}

/** Adds the person you just chatted with, proven by the lobby's token. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Bad request." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const secret = (await env()).LOBBY_TICKET_SECRET;
  const payload = secret ? await readFriendToken(body?.token ?? "", secret) : null;

  if (!payload || payload.me !== user.id) {
    return NextResponse.json({ error: "That request expired." }, { status: 400 });
  }
  if (payload.them === user.id) {
    return NextResponse.json({ error: "You cannot befriend yourself." }, { status: 400 });
  }

  const database = await db();
  const theirs = await database
    .prepare("SELECT status FROM friendships WHERE user_id = ? AND friend_id = ?")
    .bind(payload.them, user.id)
    .first<{ status: string }>();

  const now = Date.now();

  if (theirs) {
    // They asked first, so this accepts it: both directions become accepted.
    await database.batch([
      database
        .prepare(
          `INSERT INTO friendships (user_id, friend_id, status, created_at) VALUES (?, ?, 'accepted', ?)
           ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'accepted'`,
        )
        .bind(user.id, payload.them, now),
      database
        .prepare("UPDATE friendships SET status = 'accepted' WHERE user_id = ? AND friend_id = ?")
        .bind(payload.them, user.id),
    ]);
    return NextResponse.json({ state: "accepted" });
  }

  await database
    .prepare(
      `INSERT INTO friendships (user_id, friend_id, status, created_at) VALUES (?, ?, 'pending', ?)
       ON CONFLICT(user_id, friend_id) DO NOTHING`,
    )
    .bind(user.id, payload.them, now)
    .run();

  return NextResponse.json({ state: "pending" });
}

/** Removes a friendship in both directions, or declines a request. */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Bad request." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const other = body?.id;
  if (!other) return NextResponse.json({ error: "Which friend?" }, { status: 400 });

  const database = await db();
  await database.batch([
    database.prepare("DELETE FROM friendships WHERE user_id = ? AND friend_id = ?").bind(user.id, other),
    database.prepare("DELETE FROM friendships WHERE user_id = ? AND friend_id = ?").bind(other, user.id),
  ]);

  return NextResponse.json({ ok: true });
}
