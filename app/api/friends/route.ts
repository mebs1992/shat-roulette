import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/csrf";
import { currentUser } from "@/lib/auth";
import { db, env } from "@/lib/db";
import { listFriends } from "@/lib/friends";
import { clientIp, rateLimit, FRIEND_REQUEST_LIMIT } from "@/lib/ratelimit";
import { readFriendToken } from "@/shared/ticket";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ friends: await listFriends(user.id) });
}

/**
 * Sends (or auto-accepts) a friend request. The target is proven either by the
 * lobby's token — the person you just chatted with — or named directly by id
 * from a username search.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Bad request." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { token?: string; friendId?: string } | null;
  const database = await db();

  let targetId: string | null = null;

  if (body?.token) {
    const secret = (await env()).LOBBY_TICKET_SECRET;
    const payload = secret ? await readFriendToken(body.token, secret) : null;
    if (!payload || payload.me !== user.id) {
      return NextResponse.json({ error: "That request expired." }, { status: 400 });
    }
    targetId = payload.them;
  } else if (body?.friendId) {
    // A direct add from search is a request anyone can send, so rate-limit it.
    if (!(await rateLimit("friend_request", clientIp(request), FRIEND_REQUEST_LIMIT))) {
      return NextResponse.json({ error: "Too many requests. Try later." }, { status: 429 });
    }
    const target = await database
      .prepare("SELECT id FROM users WHERE id = ? AND banned_at IS NULL")
      .bind(body.friendId)
      .first<{ id: string }>();
    if (!target) return NextResponse.json({ error: "No such person." }, { status: 404 });
    targetId = target.id;
  } else {
    return NextResponse.json({ error: "Who?" }, { status: 400 });
  }

  if (targetId === user.id) {
    return NextResponse.json({ error: "You cannot befriend yourself." }, { status: 400 });
  }

  const now = Date.now();
  const theirs = await database
    .prepare("SELECT status FROM friendships WHERE user_id = ? AND friend_id = ?")
    .bind(targetId, user.id)
    .first<{ status: string }>();

  if (theirs) {
    // They asked first, so this accepts it: both directions become accepted.
    await database.batch([
      database
        .prepare(
          `INSERT INTO friendships (user_id, friend_id, status, created_at) VALUES (?, ?, 'accepted', ?)
           ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'accepted'`,
        )
        .bind(user.id, targetId, now),
      database
        .prepare("UPDATE friendships SET status = 'accepted' WHERE user_id = ? AND friend_id = ?")
        .bind(targetId, user.id),
    ]);
    return NextResponse.json({ state: "accepted" });
  }

  await database
    .prepare(
      `INSERT INTO friendships (user_id, friend_id, status, created_at) VALUES (?, ?, 'pending', ?)
       ON CONFLICT(user_id, friend_id) DO NOTHING`,
    )
    .bind(user.id, targetId, now)
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
