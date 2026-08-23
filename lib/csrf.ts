/**
 * Defense-in-depth against cross-site requests. The session cookie is already
 * SameSite=lax, which blocks cross-site POST/DELETE; this rejects any mutating
 * request whose Origin is not our own host as a second line, and costs nothing.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  // Non-browser callers (curl, tests) send no Origin; allow them — they carry
  // no ambient cookie a CSRF attack could ride.
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
