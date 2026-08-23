import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { LOGIN_LIMIT, clientIp, rateLimit } from "@/lib/ratelimit";
import { sameOrigin } from "@/lib/csrf";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Bad request." }, { status: 403 });
  if (!(await rateLimit("login", clientIp(request), LOGIN_LIMIT))) {
    return NextResponse.json({ error: "Too many attempts. Wait a bit." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password, please." }, { status: 400 });
  }

  const user = await (await db())
    .prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: string; password_hash: string | null }>();

  // Same message either way, so this cannot be used to enumerate accounts.
  const wrong = NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  if (!user?.password_hash) return wrong;
  if (!(await verifyPassword(password, user.password_hash))) return wrong;

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
