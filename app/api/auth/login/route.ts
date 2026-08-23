import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
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
