/**
 * Protocol tests for the lobby Durable Object.
 *
 * Start the worker first (`npm run realtime`), then `npm run test:lobby`.
 * These talk to it over a real websocket — no mocks, because the things worth
 * testing here are pairing, filtering and teardown, which mocks would fake.
 */

const URL = process.env.LOBBY_URL ?? "ws://localhost:8787/ws";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Mirrors shared/ticket.ts. Signing here keeps this suite standalone — it
// tests the lobby's rules, not the app's session handling.
const SECRET = process.env.LOBBY_TICKET_SECRET
  ?? process.env.LOBBY_TICKET_SECRET;

const base64url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function ticketFor(userId, num) {
  const payload = base64url(new TextEncoder().encode(JSON.stringify({ u: userId, n: num, exp: Date.now() + 300000 })));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${base64url(new Uint8Array(signature))}`;
}

let pass = 0;
let fail = 0;
const check = (label, ok, detail = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
};

let nextNum = 10000;

function open(hello) {
  const ws = new WebSocket(URL);
  ws.got = [];
  ws.onmessage = (e) => ws.got.push(JSON.parse(e.data));
  ws.onopen = async () => ws.send(JSON.stringify({ t: "hello", ticket: await ticketFor(hello.userId, hello.num), gender: hello.gender, preference: hello.preference }));
  ws.say = (o) => ws.send(JSON.stringify(o));
  ws.of = (t) => ws.got.filter((m) => m.t === t);
  return ws;
}

const man = (id) => ({ userId: id, num: nextNum++, gender: "man", preference: "anyone" });
const womanOnly = (id) => ({ userId: id, num: nextNum++, gender: "woman", preference: "woman" });
const woman = (id) => ({ userId: id, num: nextNum++, gender: "woman", preference: "anyone" });

console.log("\n1. the gender filter keeps incompatible people apart");
const a = open(man("a"));
const b = open(womanOnly("b"));
await wait(500);
b.say({ t: "queue" });
await wait(200);
a.say({ t: "queue" });
await wait(700);
check("man/anyone and woman/women-only do not pair", a.of("matched").length === 0 && b.of("matched").length === 0);
check("waiting counts are broadcast", b.of("waiting").length > 0);

console.log("\n2. longest wait is served first");
const c = open(woman("c"));
await wait(400);
c.say({ t: "queue" });
await wait(700);
check("B, who queued first, got C", b.of("matched").length === 1 && a.of("matched").length === 0);
const match = b.of("matched")[0];
check("partner carries country, gender and a server-side start time",
  !!match && !!match.partner.country && match.partner.gender === "woman" && match.partner.shitStartedAt > 0);

console.log("\n3. messages reach the partner and nobody else");
b.say({ t: "msg", text: "office or home" });
await wait(400);
check("C received it", c.of("msg").map((m) => m.text).join() === "office or home");
check("A, unpaired, received nothing", a.of("msg").length === 0);
b.say({ t: "typing", on: true });
await wait(300);
check("typing is forwarded", c.of("typing").length === 1);

console.log("\n4. a stray queue never ends a live chat");
// Regression: a re-fired effect or a reconnect used to unpair both sides and
// tell the partner they had been left, mid-conversation.
c.say({ t: "queue" });
await wait(600);
check("the partner is not told they left", b.of("left").length === 0);
c.say({ t: "msg", text: "still here" });
await wait(400);
check("the chat still works afterwards", b.of("msg").some((m) => m.text === "still here"));

console.log("\n5. rate limiting stops a flood");
for (let i = 0; i < 20; i++) b.say({ t: "msg", text: "spam " + i });
await wait(700);
check("delivery is capped", c.of("msg").length <= 13, "delivered=" + c.of("msg").length);
check("the sender is told", b.of("error").some((e) => e.code === "rate_limited"));

console.log("\n6. a dropped connection tells the other side");
c.close();
await wait(600);
check("partner saw a disconnect", b.of("left").some((l) => l.reason === "disconnect"));

console.log("\n7. blocking prevents a rematch");
a.say({ t: "cancel" });
await wait(300);
const d = open(woman("d"));
await wait(400);
b.say({ t: "queue" });
d.say({ t: "queue" });
await wait(700);
const before = b.of("matched").length;
check("B and D paired", before === 2);
b.say({ t: "block" });
await wait(400);
check("D was told the chat ended", d.of("left").length === 1);
b.say({ t: "queue" });
d.say({ t: "queue" });
await wait(900);
check("they are never paired again", b.of("matched").length === before);

console.log("\n8. oversized messages are rejected");
const e1 = open(man("e"));
const f1 = open(man("f"));
await wait(500);
b.say({ t: "cancel" });
d.say({ t: "cancel" });
await wait(200);
e1.say({ t: "queue" });
await wait(200);
f1.say({ t: "queue" });
await wait(700);
check("E and F paired", e1.of("matched").length === 1);
e1.say({ t: "msg", text: "x".repeat(900) });
await wait(400);
check("oversized message refused", e1.of("error").some((x) => x.code === "too_long"));
e1.say({ t: "msg", text: "a normal one" });
await wait(400);
check("a normal message still gets through", f1.of("msg").length === 1);

console.log(`\n${pass} passed, ${fail} failed\n`);
[a, b, d, e1, f1].forEach((s) => s.close());
await wait(300);
process.exit(fail ? 1 : 0);
