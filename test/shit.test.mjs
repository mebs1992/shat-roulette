/**
 * Shit sessions and the counters they roll forward.
 *
 *   npm run dev
 *   npm run test:shit
 */

const APP = process.env.APP_URL ?? "http://localhost:3000";
// Unique per run so the auth rate limiter buckets each suite separately.
const TEST_IP = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
let pass = 0, fail = 0;
const check = (label, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
};

let cookie = "";
async function api(path, init = {}) {
  const response = await fetch(APP + path, {
    ...init,
    headers: { "content-type": "application/json", "cf-connecting-ip": TEST_IP, ...(cookie ? { cookie } : {}), ...(init.headers ?? {}) },
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

const stamp = Date.now().toString(36);
await api("/api/auth/signup", {
  method: "POST",
  body: JSON.stringify({ username: `s_${stamp}`, email: `s_${stamp}@example.com`, password: "correcthorsebattery" }),
});

const minutes = (n) => n * 60_000;
const dayString = (offset = 0) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10);

console.log("\n1. recording a shit");
const first = await api("/api/shit", {
  method: "POST",
  body: JSON.stringify({ startedAt: Date.now() - minutes(12), shitmates: 2, messages: 30, countries: ["DE", "BR"], day: dayString() }),
});
check("accepted", first.status === 200, JSON.stringify(first.body));
check("duration measured from the start time", Math.abs(first.body.durationMs - minutes(12)) < 5000);
check("streak starts at one", first.body.streakDays === 1);

let me = (await api("/api/auth/account")).body.user;
check("total shitmates counted", me.totalShitmates === 2);
check("longest shit recorded", Math.abs(me.longestShitMs - minutes(12)) < 5000);

console.log("\n2. a second shit the same day");
await api("/api/shit", {
  method: "POST",
  body: JSON.stringify({ startedAt: Date.now() - minutes(5), shitmates: 1, messages: 4, countries: ["DE"], day: dayString() }),
});
me = (await api("/api/auth/account")).body.user;
check("shit count went up", me.totalShits === 2);
check("shitmates accumulated", me.totalShitmates === 3);
check("streak did not double-count the same day", me.streakDays === 1);
check("longest shit unchanged by a shorter one", Math.abs(me.longestShitMs - minutes(12)) < 5000);
check("total time is the sum", Math.abs(me.totalShitMs - minutes(17)) < 10_000);

console.log("\n3. rubbish input is refused");
check("missing start time refused", (await api("/api/shit", { method: "POST", body: JSON.stringify({}) })).status === 400);
const absurd = await api("/api/shit", {
  method: "POST",
  body: JSON.stringify({ startedAt: Date.now() - 86_400_000 * 3, day: dayString() }),
});
check("a three-day shit is clamped, not believed", absurd.body.durationMs <= 4 * 3_600_000);

console.log("\n4. signed-out requests are refused");
const saved = cookie;
cookie = "";
check("no session, no record", (await api("/api/shit", { method: "POST", body: JSON.stringify({ startedAt: Date.now() }) })).status === 401);
cookie = saved;

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
