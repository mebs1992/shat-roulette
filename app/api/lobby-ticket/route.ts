import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { env } from "@/lib/db";
import { TICKET_TTL_MS, mintTicket } from "@/shared/ticket";

/** A short-lived, signed pass that lets the lobby trust who is connecting. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const secret = (await env()).LOBBY_TICKET_SECRET;
  if (!secret) {
    // Fail closed: without a secret we cannot issue a ticket nobody can forge.
    console.error("LOBBY_TICKET_SECRET is unset — refusing to mint a lobby ticket.");
    return NextResponse.json({ error: "Chat is temporarily unavailable." }, { status: 503 });
  }

  const ticket = await mintTicket(
    { u: user.id, n: user.shitmate_num, exp: Date.now() + TICKET_TTL_MS },
    secret,
  );

  return NextResponse.json({ ticket }, { headers: { "cache-control": "no-store" } });
}
