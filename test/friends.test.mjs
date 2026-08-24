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

console.log("\n4b. a friend's stats page is friends-only");
const bobId = alicesList[0].id;
// Alice and Bob are accepted friends, so Alice can open Bob's profile.
const aliceView = await (await api(alice, `/friends/${bobId}`)).text();
check("a friend sees the profile", aliceView.includes(bob.username), "username missing from profile");
check("the profile shows shit stats", /Total shitting|Shitmates|Shit streak/.test(aliceView));

// Carol is a stranger to Bob. She must not see his username or stats.
const carol = await makeAccount("c");
const carolView = await (await api(carol, `/friends/${bobId}`)).text();
check("a non-friend cannot see the username", !carolView.includes(bob.username), "leaked username to a stranger");

// Signed out, likewise nothing.
const anonView = await (await fetch(`${APP}/friends/${bobId}`)).text();
check("signed out sees nothing of it", !anonView.includes(bob.username), "leaked username to a signed-out visitor");

console.log("\n4c. search and add by username");
const search = async (account, q) =>
  (await (await api(account, `/api/friends/search?q=${encodeURIComponent(q)}`)).json()).results ?? [];

// Alice and Bob are friends, so a search shows that state.
const aliceFinds = await search(alice, bob.username);
check("search finds the user", aliceFinds.some((r) => r.username === bob.username), JSON.stringify(aliceFinds));
check("an existing friend reads as accepted", aliceFinds.find((r) => r.username === bob.username)?.state === "accepted");
check("search never returns yourself", !aliceFinds.some((r) => r.username === alice.username));
check("search leaks no email or stats", aliceFinds.every((r) => !("email" in r) && !("total_shit_ms" in r)));

// Carol is a stranger to Bob. She can find and add him.
const carolFinds = await search(carol, bob.username);
check("a stranger can be found by name", carolFinds.find((r) => r.username === bob.username)?.state === "none");
const carolBob = carolFinds.find((r) => r.username === bob.username);
const added = await (await api(carol, "/api/friends", { method: "POST", body: JSON.stringify({ friendId: carolBob.id }) })).json();
check("adding by id creates a request", added.state === "pending", JSON.stringify(added));
const bobIncoming = (await (await api(bob, "/api/friends")).json()).friends;
check("bob sees carol's incoming request", bobIncoming.some((f) => f.username === carol.username && f.state === "incoming"));
const carolAgain = await search(carol, bob.username);
check("the search now shows it as sent", carolAgain.find((r) => r.username === bob.username)?.state === "pending");

check("a one-letter search returns nothing", (await search(alice, "a")).length === 0);
const missing = await api(alice, "/api/friends", { method: "POST", body: JSON.stringify({ friendId: "no-such-user-id" }) });
check("adding a non-existent id is refused", missing.status === 404, `got ${missing.status}`);
const anonSearch = await fetch(`${APP}/api/friends/search?q=${encodeURIComponent(bob.username)}`);
check("search requires an account", anonSearch.status === 401);

// Tidy up carol's request so the removal checks below see a clean slate.
const carolReq = bobIncoming.find((f) => f.username === carol.username);
if (carolReq) await api(bob, "/api/friends", { method: "DELETE", body: JSON.stringify({ id: carolReq.id }) });

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
