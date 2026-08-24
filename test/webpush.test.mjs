/**
 * Web push crypto: the RFC 8291 §5 encryption vector byte-for-byte, and a VAPID
 * JWT that verifies against its own public key with the right claims.
 *
 *   npm run test:push
 *
 * (Actual delivery to a phone can't be tested without a real push endpoint and
 * a device; this proves the crypto that delivery depends on.)
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let pass = 0, fail = 0;
const check = (l, ok) => { ok ? pass++ : fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${l}`); };

const dir = mkdtempSync(join(tmpdir(), "wp-"));
const out = join(dir, "webpush.mjs");
execFileSync("npx", ["esbuild", "lib/webpush.ts", "--bundle", "--format=esm", "--platform=neutral", `--outfile=${out}`], { stdio: "ignore" });
const { encryptPayload, vapidHeader, _test } = await import(out);
const { b64urlToBytes, bytesToB64url } = _test;

console.log("\n1. RFC 8291 encryption vector");
{
  const uaPublic = "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4";
  const asPublic = "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
  const asPrivate = "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw";
  const asPubRaw = b64urlToBytes(asPublic);
  const priv = await crypto.subtle.importKey("jwk",
    { kty: "EC", crv: "P-256", ext: true, d: asPrivate, x: bytesToB64url(asPubRaw.slice(1, 33)), y: bytesToB64url(asPubRaw.slice(33, 65)) },
    { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  const body = await encryptPayload(
    new TextEncoder().encode("When I grow up, I want to be a watermelon"),
    b64urlToBytes(uaPublic), b64urlToBytes("BTBZMqHH6r4Tts7J_aSIgg"),
    { priv, pubRaw: asPubRaw }, b64urlToBytes("DGv6ra1nlYgDCS1FRnbzlw"));
  const expected = "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN";
  check("ciphertext matches the vector byte-for-byte", bytesToB64url(body) === expected);
}

console.log("\n2. VAPID JWT");
{
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const pubB64 = bytesToB64url(pubRaw);
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const header = await vapidHeader("https://fcm.googleapis.com/fcm/send/abc", "mailto:me@x.com", pubB64,
    { kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x, y: jwk.y });

  const m = /^vapid t=([^,]+), k=(.+)$/.exec(header);
  check("header has the vapid t=/k= shape", !!m);
  const jwt = m[1];
  check("k= is the server public key", m[2] === pubB64);

  const [h, p, sig] = jwt.split(".");
  const claims = JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
  check("aud is the endpoint origin", claims.aud === "https://fcm.googleapis.com");
  check("sub is the subject", claims.sub === "mailto:me@x.com");
  check("exp is in the future and within 24h", claims.exp > Date.now() / 1000 && claims.exp < Date.now() / 1000 + 86400);

  const verified = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pair.publicKey,
    b64urlToBytes(sig), new TextEncoder().encode(`${h}.${p}`));
  check("the signature verifies against the public key", verified);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
