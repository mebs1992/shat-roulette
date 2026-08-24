import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { sameOrigin } from "@/lib/csrf";
import { db } from "@/lib/db";

/** Store (or refresh) this browser's push subscription for the signed-in user. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Bad request." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    | null;
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (!endpoint || !p256dh || !auth) return NextResponse.json({ error: "Bad subscription." }, { status: 400 });

  await (await db())
    .prepare(
      `INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    )
    .bind(endpoint, user.id, p256dh, auth, Date.now())
    .run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Bad request." }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
  if (body?.endpoint) {
    await (await db()).prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(body.endpoint).run();
  }
  return NextResponse.json({ ok: true });
}
