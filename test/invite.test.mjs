/**
 * Invite a friend to shit: two accounts befriend, one invites, both land in the
 * SAME private room and chat directly.
 *
 *   npm run dev / npm run realtime, then npm run test:invite
 */
const APP = process.env.APP_URL ?? "http://localhost:3000";
const LOBBY = process.env.LOBBY_URL ?? "ws://localhost:8787/ws";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (l, ok, d = "") => { ok ? pass++ : fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}${d ? " — " + d : ""}`); };

let ipN = Math.floor(Math.random() * 200) + 1;
async function account(tag) {
  const stamp = `${Math.random().toString(36).slice(2, 7)}${ipN}`;
  const r = await fetch(`${APP}/api/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": `192.0.2.${(ipN++) % 254 + 1}` },
    body: JSON.stringify({ username: `iv${stamp}`, email: `iv_${stamp}_${tag}@example.com`, password: "correcthorsebattery" }),
  });
  const body = await r.json();
  return { cookie: (r.headers.get("set-cookie") ?? "").split(";")[0], id: body.id, num: body.shitmate_num, username: `iv${stamp}` };
}
const api = (who, path, init = {}) =>
  fetch(APP + path, { ...init, headers: { "content-type": "application/json", cookie: who.cookie, ...(init.headers ?? {}) } });
async function ticket(a) { return (await (await api(a, "/api/lobby-ticket")).json()).ticket; }
function open() {
  const ws = new WebSocket(LOBBY);
  ws.got = []; ws.onmessage = (e) => ws.got.push(JSON.parse(e.data));
  ws.of = (t) => ws.got.filter((m) => m.t === t);
  ws.ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  return ws;
}

// Make A and B friends (they must have met — reuse the lobby match + friend tokens).
const A = await account("a");
const B = await account("b");
{
  const a = open(), b = open();
  await Promise.all([a.ready, b.ready]);
  a.send(JSON.stringify({ t: "hello", ticket: await ticket(A), gender: "man", preference: "anyone" }));
  b.send(JSON.stringify({ t: "hello", ticket: await ticket(B), gender: "woman", preference: "anyone" }));
  await wait(400);
  a.send(JSON.stringify({ t: "queue" })); await wait(200);
  b.send(JSON.stringify({ t: "queue" })); await wait(700);
  const at = a.of("matched")[0]?.friendToken, bt = b.of("matched")[0]?.friendToken;
  await api(A, "/api/friends", { method: "POST", body: JSON.stringify({ token: at }) });
  await api(B, "/api/friends", { method: "POST", body: JSON.stringify({ token: bt }) });
  a.close(); b.close();
}
console.log("\n1. an invite creates a room only friends can use");
const inv = await api(A, "/api/invites", { method: "POST", body: JSON.stringify({ friendId: B.id }) });
const { roomId } = await inv.json();
check("inviting an accepted friend succeeds", inv.status === 200 && !!roomId);

const stranger = await account("stranger");
const badInvite = await api(A, "/api/invites", { method: "POST", body: JSON.stringify({ friendId: stranger.id }) });
check("inviting a non-friend is refused (403)", badInvite.status === 403, `got ${badInvite.status}`);

console.log("\n2. B sees the invite");
const pending = await (await api(B, "/api/invites")).json();
check("B has one pending invite from A", pending.invites.length === 1 && pending.invites[0].fromUsername === A.username);
const acc = await api(B, "/api/invites/accept", { method: "POST", body: JSON.stringify({ id: pending.invites[0].id }) });
const accepted = await acc.json();
check("accepting returns the same room id", accepted.roomId === roomId);

console.log("\n3. both joining the room pair DIRECTLY");
const a = open(), b = open();
await Promise.all([a.ready, b.ready]);
a.send(JSON.stringify({ t: "hello", ticket: await ticket(A), gender: "man", preference: "anyone" }));
b.send(JSON.stringify({ t: "hello", ticket: await ticket(B), gender: "woman", preference: "anyone" }));
await wait(400);
a.send(JSON.stringify({ t: "joinRoom", roomId })); await wait(300);
check("first to the room waits (not yet matched)", a.of("matched").length === 0);
b.send(JSON.stringify({ t: "joinRoom", roomId })); await wait(600);
check("second arrival pairs them", a.of("matched").length === 1 && b.of("matched").length === 1);
check("the match is flagged as a direct friend match", a.of("matched")[0]?.direct === true);
check("A is talking to B, by number", a.of("matched")[0]?.partner.num === B.num);

console.log("\n4. messages flow in the private room");
a.send(JSON.stringify({ t: "msg", text: "you actually came" })); await wait(400);
check("B receives it", b.of("msg")[0]?.text === "you actually came");

console.log(`\n${pass} passed, ${fail} failed\n`);
a.close(); b.close();
await wait(200);
process.exit(fail ? 1 : 0);
