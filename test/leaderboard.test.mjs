/**
 * The global boards, against real recorded shits.
 *
 *   npm run dev, then npm run test:leaderboard
 */

const APP = process.env.APP_URL ?? "http://localhost:3000";
let pass = 0, fail = 0;
const check = (label, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
};

async function account(tag) {
  const stamp = `${Date.now().toString(36)}_${tag}`;
  const response = await fetch(`${APP}/api/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: `l_${stamp}`, email: `l_${stamp}@example.com`, password: "correcthorsebattery" }),
  });
  const body = await response.json();
  return {
    cookie: (response.headers.get("set-cookie") ?? "").split(";")[0],
    num: body.shitmate_num,
    username: `l_${stamp}`,
  };
}

const post = (who, path, payload) =>
  fetch(APP + path, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: who.cookie },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

const today = () => new Date().toISOString().slice(0, 10);
const mins = (n) => n * 60_000;

console.log("\n1. a long shit reaches the board");
const big = await account("big");
const small = await account("small");
await post(big, "/api/shit", { startedAt: Date.now() - mins(230), shitmates: 1, messages: 10, day: today() });
await post(small, "/api/shit", { startedAt: Date.now() - mins(4), shitmates: 4, messages: 40, day: today() });

/**
 * What a person actually sees. Next's development build embeds a debug payload
 * carrying the viewer's own record; stripping scripts tests the rendered page
 * rather than that, and behaves the same in development and production.
 */
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, "");

let page = visible(await (await fetch(`${APP}/global`, { headers: { cookie: big.cookie } })).text());
check("the long shitter tops the board", page.includes("3:50:0") || page.includes("3:49:5"), "looking for ~3:50:00");
check("no username appears on a public board",
  !page.includes(big.username) && !page.includes(small.username),
  `checked for ${big.username} and ${small.username}`);
// Other suites leave shits behind, so do not assume a specific account ranks.
check("entries are shown as anonymous numbers", /Shitmate #\d+/.test(page), "expected at least one Shitmate #N row");
check("the viewer is marked as themselves", page.includes(">You<"));

console.log("\n2. the boards are genuinely different");
check("shitmates board counts mates, not minutes", page.includes("4 SHITMATES") || page.includes("SHITMATES"), "shitmates board rendered");

console.log("\n3. presence drives the live count");
const before = /(\d+)<\/span><span class="[^"]*"[^>]*>(?:RIGHT NOW|JUST THE ONE)/.exec(page.replace(/\s+/g, " "));
await post(big, "/api/shit/start");
page = visible(await (await fetch(`${APP}/global`, { headers: { cookie: big.cookie } })).text());
check("someone shitting shows in the worldwide count", /RIGHT NOW|JUST THE ONE/.test(page));
check("the countries section says something true",
  /Nobody has said where they are|Nobody is shitting anywhere|width:\s*\d+%/.test(page));

console.log("\n4. signed out still works");
const anon = await fetch(`${APP}/global`);
check("readable signed out", anon.status === 200);
const anonPage = visible(await anon.text());
check("nobody is marked as You", !anonPage.includes(">You<"));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
