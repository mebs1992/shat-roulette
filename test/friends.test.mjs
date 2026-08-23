/**
 * Friends and presence, end to end: two accounts get matched by the lobby,
 * redeem the friend token it issues, and see each other's presence.
 *
 *   npm run dev / npm run realtime, then npm run test:friends
 */

const APP = process.env.APP_URL ?? "http://localhost:3000";
// Unique per run so the auth rate limiter buckets each suite separately.
const TEST_IP = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
const LOBBY = process.env.LOBBY_URL ?? "ws://localhost:8787/ws";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (label, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
};

async function makeAccount(tag) {
  const stamp = `${Date.now().toString(36)}_${tag}`;
  const response = await fetch(`${APP}/api/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": TEST_IP },
    body: JSON.stringify({ username: `f_${stamp}`, email: `f_${stamp}@example.com`, password: "correcthorsebattery" }),
  });
  const created = await response.json();
  return { cookie: (response.headers.get("set-cookie") ?? "").split(";")[0], num: created.shitmate_num, username: `f_${stamp}` };
}

const api = (account, path, init = {}) =>
  fetch(APP + path, {
    ...init,
    headers: { "content-type": "application/json", "cf-connecting-ip": TEST_IP, cookie: account.cookie, ...(init.headers ?? {}) },
  });

async function connect(account, gender) {
  const ticket = await (await api(account, "/api/lobby-ticket")).json();
  const ws = new WebSocket(LOBBY);
  ws.got = [];
  ws.onmessage = (e) => ws.got.push(JSON.parse(e.data));
  ws.of = (t) => ws.got.filter((m) => m.t === t);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.send(JSON.stringify({ t: "hello", ticket: ticket.ticket, gender, preference: "anyone" }));
  await wait(400);
  return ws;
}

console.log("\n1. the lobby issues a friend token to each side");
const alice = await makeAccount("a");
const bob = await makeAccount("b");
const a = await connect(alice, "man");
const b = await connect(bob, "woman");
a.send(JSON.stringify({ t: "queue" }));
await wait(300);
b.send(JSON.stringify({ t: "queue" }));
await wait(900);

const aMatch = a.of("matched")[0];
const bMatch = b.of("matched")[0];
check("both matched", !!aMatch && !!bMatch);
check("both got a friend token", !!aMatch?.friendToken && !!bMatch?.friendToken);
check("the tokens differ", aMatch?.friendToken !== bMatch?.friendToken);

console.log("\n2. a forged token is refused");
const forged = await api(alice, "/api/friends", { method: "POST", body: JSON.stringify({ token: "not.a.token" }) });
check("rubbish token rejected", forged.status === 400);
const stolen = await api(alice, "/api/friends", { method: "POST", body: JSON.stringify({ token: bMatch.friendToken }) });
check("someone else's token rejected", stolen.status === 400, `got ${stolen.status}`);

console.log("\n3. adding, then accepting");
const asked = await (await api(alice, "/api/friends", { method: "POST", body: JSON.stringify({ token: aMatch.friendToken }) })).json();
check("first add is pending", asked.state === "pending", JSON.stringify(asked));

let bobsList = (await (await api(bob, "/api/friends")).json()).friends;
check("bob sees an incoming request", bobsList.length === 1 && bobsList[0].state === "incoming", JSON.stringify(bobsList));

const accepted = await (await api(bob, "/api/friends", { method: "POST", body: JSON.stringify({ token: bMatch.friendToken }) })).json();
check("bob adding back accepts it", accepted.state === "accepted");

const alicesList = (await (await api(alice, "/api/friends")).json()).friends;
bobsList = (await (await api(bob, "/api/friends")).json()).friends;
check("both sides now accepted", alicesList[0]?.state === "accepted" && bobsList[0]?.state === "accepted");
check("alice sees bob's username", alicesList[0]?.username === bob.username);

console.log("\n4. presence: offline, available, shitting");
// Bob signed up but has never sent a heartbeat.
check("bob starts offline", alicesList[0]?.presence === "offline", alicesList[0]?.presence);

await api(bob, "/api/presence", { method: "POST" });
let refreshed = (await (await api(alice, "/api/friends")).json()).friends;
check("a heartbeat makes bob available", refreshed[0]?.presence === "available", refreshed[0]?.presence);

await api(bob, "/api/shit/start", { method: "POST" });
refreshed = (await (await api(alice, "/api/friends")).json()).friends;
check("shitting outranks available", refreshed[0]?.presence === "shitting", refreshed[0]?.presence);

await api(bob, "/api/shit", { method: "POST", body: JSON.stringify({ startedAt: Date.now() - 60_000, day: new Date().toISOString().slice(0, 10) }) });
refreshed = (await (await api(alice, "/api/friends")).json()).friends;
check("finishing drops him back to available", refreshed[0]?.presence === "available", refreshed[0]?.presence);

console.log("\n5. removing");
await api(alice, "/api/friends", { method: "DELETE", body: JSON.stringify({ id: alicesList[0].id }) });
check("gone for alice", (await (await api(alice, "/api/friends")).json()).friends.length === 0);
check("gone for bob too", (await (await api(bob, "/api/friends")).json()).friends.length === 0);

console.log("\n6. signed out");
const anon = await fetch(`${APP}/api/friends`);
check("friends list requires an account", anon.status === 401);

console.log(`\n${pass} passed, ${fail} failed\n`);
[a, b].forEach((s) => s.close());
await wait(200);
process.exit(fail ? 1 : 0);
