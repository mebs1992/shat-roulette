import { NextResponse } from "next/server";
import { currentUser, newId } from "@/lib/auth";
import { sameOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";

/** Invites older than this are stale — nobody's still on the toilet an hour on. */
const INVITE_TTL_MS = 30 * 60_000;

export type Invite = {
  id: string;
  roomId: string;
  fromUsername: string;
  fromNum: number;
  createdAt: number;
};

/** Pending invites addressed to me, freshest first. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const rows = await (await db())
    .prepare(
      `SELECT i.id, i.room_id, i.created_at, u.username, u.shitmate_num
         FROM invites i JOIN users u ON u.id = i.from_id
        WHERE i.to_id = ? AND i.status = 'pending' AND i.created_at > ?
        ORDER BY i.created_at DESC`,
    )
    .bind(user.id, Date.now() - INVITE_TTL_MS)
    .all<{ id: string; room_id: string; created_at: number; username: string; shitmate_num: number }>();

  const invites: Invite[] = (rows.results ?? []).map((r) => ({
    id: r.id,
    roomId: r.room_id,
    fromUsername: r.username,
    fromNum: r.shitmate_num,
    createdAt: r.created_at,
  }));
  return NextResponse.json({ invites });
}

/** Invite a friend into a private room. Returns the room id the inviter joins. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Bad request." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { friendId?: string } | null;
  const friendId = body?.friendId;
  if (!friendId) return NextResponse.json({ error: "Which friend?" }, { status: 400 });

  const database = await db();

  // Only an accepted friend can be invited.
  const friend = await database
    .prepare("SELECT status FROM friendships WHERE user_id = ? AND friend_id = ? AND status = 'accepted'")
    .bind(user.id, friendId)
    .first<{ status: string }>();
  if (!friend) return NextResponse.json({ error: "Not your friend." }, { status: 403 });

  const roomId = newId() + newId();
  await database
    .prepare("INSERT INTO invites (id, from_id, to_id, room_id, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(newId(), user.id, friendId, roomId, Date.now())
    .run();

  // Nudge them even if the app is closed — the whole point of the feature.
  void notify(friendId, {
    title: `${user.username} wants to shit with you`,
    body: "Tap to join them.",
    url: "/",
    tag: "invite",
  });

  return NextResponse.json({ roomId });
}
