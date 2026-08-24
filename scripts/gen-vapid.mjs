/**
 * Generates a VAPID keypair for web push.
 *   node scripts/gen-vapid.mjs
 * Prints the values to set: NEXT_PUBLIC_VAPID_PUBLIC_KEY (safe to expose),
 * VAPID_PRIVATE_JWK and VAPID_SUBJECT (secrets).
 */
const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
const b64url = (b) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + b64url(pubRaw));
console.log("VAPID_PRIVATE_JWK=" + JSON.stringify({ kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x, y: jwk.y }));
console.log('VAPID_SUBJECT=mailto:you@example.com');
