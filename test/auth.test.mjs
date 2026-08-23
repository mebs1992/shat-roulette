/**
 * Account tests, against a running app (`npm run dev`).
 *
 *   npm run test:auth
 *
 * Talks to the real route handlers and the real D1 binding, because the things
 * worth testing here are session cookies, uniqueness and deletion.
 */

const BASE = process.env.APP_URL ?? "http://localhost:3000";
// Unique per run so the auth rate limiter buckets each suite separately.
const TEST_IP = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
let pass = 0;
let fail = 0;
const check = (label, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
};

// Unique per run so the suite can be run repeatedly against the same database.
const stamp = Date.now().toString(36);
const account = {
  username: `tester_${stamp}`,
  email: `tester_${stamp}@example.com`,
  password: "correcthorsebattery",
};

let cookie = "";
async function api(path, init = {}) {
  const response = await fetch(BASE + path, {
    ...init,
    headers: { "content-type": "application/json", "cf-connecting-ip": TEST_IP, ...(cookie ? { cookie } : {}), ...(init.headers ?? {}) },
    redirect: "manual",
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body, location: response.headers.get("location") };
}

console.log("\n1. signup validation");
check("short password refused", (await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ ...account, password: "abc" }) })).status === 400);
check("bad email refused", (await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ ...account, email: "nope" }) })).status === 400);
check("bad username refused", (await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ ...account, username: "a b!" }) })).status === 400);

console.log("\n2. signing up");
const created = await api("/api/auth/signup", { method: "POST", body: JSON.stringify(account) });
check("account created", created.status === 200, JSON.stringify(created.body).slice(0, 80));
check("got a shitmate number", typeof created.body.shitmate_num === "number");
check("username and email cannot be reused",
  (await api("/api/auth/signup", { method: "POST", body: JSON.stringify(account) })).status === 409);

console.log("\n3. the session works");
const me = await api("/api/auth/account");
check("signed in as the new account", me.body.user?.username === account.username);
check("strangers see a number, not the username", me.body.user?.publicName === `Shitmate #${created.body.shitmate_num}`);

console.log("\n4. gated pages");
const gated = await fetch(BASE + "/confirm", { redirect: "manual", headers: { cookie } });
check("reachable when signed in", gated.status === 200, String(gated.status));
const anon = await fetch(BASE + "/confirm", { redirect: "manual" });
check("redirected to join when signed out", anon.status === 307 && (anon.headers.get("location") ?? "").endsWith("/join"));

console.log("\n5. signing out and back in");
await api("/api/auth/logout", { method: "POST" });
cookie = "";
check("session no longer valid", (await api("/api/auth/account")).body.user === null);
check("wrong password rejected",
  (await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: account.email, password: "wrong" }) })).status === 401);
check("correct password accepted",
  (await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: account.email, password: account.password }) })).status === 200);
check("signed in again", (await api("/api/auth/account")).body.user?.username === account.username);

console.log("\n6. no page ever ships a password hash");
for (const path of ["/", "/stats", "/settings", "/global", "/friends"]) {
  const html = await (await fetch(BASE + path, { headers: { cookie } })).text();
  check(`${path} carries no hash`, !html.includes("pbkdf2$"));
}

console.log("\n7. deleting the account");
check("deletion accepted", (await api("/api/auth/account", { method: "DELETE" })).status === 200);
cookie = "";
check("cannot sign in afterwards",
  (await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: account.email, password: account.password }) })).status === 401);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
