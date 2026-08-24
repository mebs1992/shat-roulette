import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { searchUsers } from "@/lib/friends";
import { clientIp, rateLimit, SEARCH_LIMIT } from "@/lib/ratelimit";

/** Finds people by username so you can add a friend you already know. */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!(await rateLimit("search", clientIp(request), SEARCH_LIMIT))) {
    return NextResponse.json({ error: "Slow down." }, { status: 429 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({ results: await searchUsers(user.id, query) });
}
