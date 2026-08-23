/**
 * End-to-end: a signed-in account gets a lobby ticket, the lobby verifies it,
 * and only then can that account queue and chat.
 *
 *   npm run dev        (terminal one)
 *   npm run realtime   (terminal two)
 *   npm run test:lobby-auth
 */

const APP = process.env.APP_URL ?? "http://localhost:3000";
const LOBBY = process.env.LOBBY_URL ?? "ws://localhost:8787/ws";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const check = (label, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
};

async function makeAccount(tag) {
  const stamp = `${Date.now().toString(36)}_${tag}`;
  const body = { username: `t_${stamp}`, email: `t_${stamp}@example.com`, password: "correcthorsebattery" };
  const response = await fetch(`${APP}/api/auth/signup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const cookie = (response.headers.get("set-cookie") ?? "").split(";")[0];
  const created = await response.json();
  return { cookie, num: created.shitmate_num };
}

async function ticketFor(cookie) {
  const response = await fetch(`${APP}/api/lobby-ticket`, { headers: { cookie } });
  if (!response.ok) return null;
  return (await response.json()).ticket;
}

async function connect() {
  const ws = new WebSocket(LOBBY);
  ws.got = [];
  ws.onmessage = (e) => ws.got.push(JSON.parse(e.data));
  ws.say = (o) => ws.send(JSON.stringify(o));
  ws.of = (t) => ws.got.filter((m) => m.t === t);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  return ws;
}

console.log("\n1. the lobby refuses unauthenticated connections");
const stranger = await connect();
await wait(500);
stranger.say({ t: "queue" });
await wait(500);
check("queueing without a ticket is refused", stranger.of("error").some((e) => e.code === "unauthenticated"));
stranger.say({ t: "hello", ticket: "forged.nonsense", gender: "man", preference: "anyone" });
await wait(500);
check("a forged ticket is refused", stranger.of("error").filter((e) => e.code === "unauthenticated").length >= 2);
check("no identity was granted", stranger.of("identified").length === 0);

console.log("\n1b. a ticket signed with the OLD published dev secret is refused");
{
  const b64 = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const oldSecret = "dev-only-lobby-secret-set-LOBBY_TICKET_SECRET-before-launch";
  const payload = b64(Buffer.from(JSON.stringify({ u: "attacker", n: 99999, exp: Date.now() + 300000 })));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(oldSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const forged = `${payload}.${b64(Buffer.from(new Uint8Array(sig)))}`;

  const raw = new WebSocket(LOBBY);
  const got = [];
  raw.onmessage = (e) => got.push(JSON.parse(e.data));
  await new Promise((resolve, reject) => { raw.onopen = resolve; raw.onerror = reject; });
  raw.send(JSON.stringify({ t: "hello", ticket: forged, gender: "man", preference: "anyone" }));
  await wait(600);
  const rejected = got.some((m) => m.t === "error" && m.code === "unauthenticated");
  const identified = got.some((m) => m.t === "identified");
  check("forged dev-secret ticket rejected", rejected && !identified);
  raw.close();
}

console.log("\n2. real accounts are identified by their ticket");
const alice = await makeAccount("a");
const bob = await makeAccount("b");
const a = await connect();
const b = await connect();
await wait(500);
a.say({ t: "hello", ticket: await ticketFor(alice.cookie), gender: "man", preference: "anyone" });
b.say({ t: "hello", ticket: await ticketFor(bob.cookie), gender: "woman", preference: "anyone" });
await wait(800);
check("A identified with its account number", a.of("identified")[0]?.num === alice.num, `got ${a.of("identified")[0]?.num}, expected ${alice.num}`);
check("B identified with its account number", b.of("identified")[0]?.num === bob.num);

console.log("\n3. identified accounts match and chat");
a.say({ t: "queue" });
await wait(300);
b.say({ t: "queue" });
await wait(800);
check("they matched", a.of("matched").length === 1 && b.of("matched").length === 1);
check("A sees B's real number", a.of("matched")[0]?.partner.num === bob.num);
a.say({ t: "msg", text: "office or home" });
await wait(400);
check("the message arrived", b.of("msg")[0]?.text === "office or home");

console.log("\n4. the same account cannot match itself from two devices");
const phone = await connect();
const laptop = await connect();
await wait(400);
phone.say({ t: "hello", ticket: await ticketFor(alice.cookie), gender: "man", preference: "anyone" });
laptop.say({ t: "hello", ticket: await ticketFor(alice.cookie), gender: "man", preference: "anyone" });
await wait(700);
a.say({ t: "leave" });
await wait(300);
phone.say({ t: "queue" });
await wait(300);
laptop.say({ t: "queue" });
await wait(900);
check("one account on two connections never pairs with itself",
  phone.of("matched").length === 0 && laptop.of("matched").length === 0);

console.log(`\n${pass} passed, ${fail} failed\n`);
[stranger, a, b, phone, laptop].forEach((s) => s.close());
await wait(300);
process.exit(fail ? 1 : 0);
