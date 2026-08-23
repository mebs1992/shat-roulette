import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createSession,
  hashPassword,
  newId,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/auth";
import { SIGNUP_LIMIT, clientIp, rateLimit } from "@/lib/ratelimit";
import { sameOrigin } from "@/lib/csrf";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Bad request." }, { status: 403 });
  if (!(await rateLimit("signup", clientIp(request), SIGNUP_LIMIT))) {
    return NextResponse.json({ error: "Too many attempts. Wait a bit." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as
    | { username?: string; email?: string; password?: string }
    | null;
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const username = (body.username ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  const problem = validateUsername(username) ?? validateEmail(email) ?? validatePassword(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const database = await db();

  const taken = await database
    .prepare("SELECT id FROM users WHERE lower(username) = ? OR email = ?")
    .bind(username.toLowerCase(), email)
    .first<{ id: string }>();
  if (taken) {
    // Deliberately vague: this endpoint is unauthenticated, so a precise answer
    // would let anyone test which emails have accounts.
    return NextResponse.json({ error: "That username or email is already taken." }, { status: 409 });
  }

  const id = newId();
  // Public number, unique, and not derived from anything about the person.
  let shitmateNum = 0;
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = 10_000 + Math.floor(Math.random() * 89_999);
    const clash = await database
      .prepare("SELECT id FROM users WHERE shitmate_num = ?")
      .bind(candidate)
      .first<{ id: string }>();
    if (!clash) {
      shitmateNum = candidate;
      break;
    }
  }
  if (!shitmateNum) {
    return NextResponse.json({ error: "Could not allocate a shitmate number." }, { status: 503 });
  }

  const country = request.headers.get("cf-ipcountry");

  await database
    .prepare(
      `INSERT INTO users (id, username, shitmate_num, email, password_hash, country, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, username, shitmateNum, email, await hashPassword(password), country, Date.now())
    .run();

  await createSession(id);
  return NextResponse.json({ id, username, shitmate_num: shitmateNum });
}
