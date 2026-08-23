import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { env } from "@/lib/db";
import { DEV_SECRET, TICKET_TTL_MS, mintTicket } from "@/shared/ticket";

/** A short-lived, signed pass that lets the lobby trust who is connecting. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const secret = (await env()).LOBBY_TICKET_SECRET;
  if (!secret) {
    console.warn("LOBBY_TICKET_SECRET is unset — using the development secret. Do not launch like this.");
  }

  const ticket = await mintTicket(
    { u: user.id, n: user.shitmate_num, exp: Date.now() + TICKET_TTL_MS },
    secret ?? DEV_SECRET,
  );

  return NextResponse.json({ ticket }, { headers: { "cache-control": "no-store" } });
}
