/**
 * Image relay tests for the lobby Durable Object.
 *
 * Start the worker first (`npm run realtime`), then `npm run test:image`.
 * Real websockets, real pairing — the point is that an image reaches the
 * partner in-memory and that malformed or oversized payloads are refused
 * before they ever touch someone else's screen. Nothing here is stored.
 */

const URL = process.env.LOBBY_URL ?? "ws://localhost:8787/ws";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const SECRET = process.env.LOBBY_TICKET_SECRET;

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

let nextNum = 60000;

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

// A 1x1 transparent PNG — the smallest real image data URL.
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

console.log("\n1. a paired partner receives the image, nobody else does");
const a = open(man("img_a"));
const b = open(man("img_b"));
const c = open(man("img_c"));
await wait(500);
a.say({ t: "queue" });
await wait(150);
b.say({ t: "queue" });
await wait(700);
check("A and B paired", a.of("matched").length === 1 && b.of("matched").length === 1);

a.say({ t: "img", data: TINY_PNG });
await wait(400);
check("B received the image", b.of("img").length === 1 && b.of("img")[0].data === TINY_PNG);
check("the image carries a server timestamp", (b.of("img")[0]?.at ?? 0) > 0);
check("C, unpaired, received nothing", c.of("img").length === 0);

console.log("\n2. a non-image data URL is refused");
a.say({ t: "img", data: "data:text/html;base64,PHNjcmlwdD4=" });
await wait(300);
check("sender told it was a bad image", a.of("error").some((e) => e.code === "bad_image"));
check("nothing extra reached B", b.of("img").length === 1);

console.log("\n3. an oversized payload is refused before relay");
const huge = "data:image/jpeg;base64," + "A".repeat(400000);
a.say({ t: "img", data: huge });
await wait(300);
check("sender told it was too big", a.of("error").some((e) => e.code === "too_big"));
check("still nothing extra reached B", b.of("img").length === 1);

console.log("\n4. an unpaired client cannot send an image");
c.say({ t: "img", data: TINY_PNG });
await wait(300);
check("unpaired sender told not_paired", c.of("error").some((e) => e.code === "not_paired"));

console.log(`\n${pass} passed, ${fail} failed\n`);
[a, b, c].forEach((s) => s.close());
await wait(300);
process.exit(fail ? 1 : 0);
