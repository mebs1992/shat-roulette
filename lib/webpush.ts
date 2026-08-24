/**
 * Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) on WebCrypto — no libraries,
 * so it runs in the Worker that serves the app. The encryption is verified
 * against the RFC 8291 §5 test vector in test/webpush.test.mjs.
 */

const enc = new TextEncoder();

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
}
function bytesToB64url(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concat(...arrs: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm as BufferSource, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

/** Encrypt a payload for a subscription. `serverKeys` is injectable for testing. */
export async function encryptPayload(
  plaintext: Uint8Array,
  p256dh: Uint8Array,
  authSecret: Uint8Array,
  serverKeys?: { priv: CryptoKey; pubRaw: Uint8Array },
  fixedSalt?: Uint8Array,
): Promise<Uint8Array> {
  const salt = fixedSalt ?? crypto.getRandomValues(new Uint8Array(16));

  const server = serverKeys ?? (await (async () => {
    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    return { priv: pair.privateKey, pubRaw };
  })());

  const uaPub = await crypto.subtle.importKey("raw", p256dh as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaPub }, server.priv, 256));

  // key_info = "WebPush: info\0" || ua_public || as_public
  const keyInfo = concat(enc.encode("WebPush: info\0"), p256dh, server.pubRaw);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);

  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const key = await crypto.subtle.importKey("raw", cek as BufferSource, "AES-GCM", false, ["encrypt"]);
  // padding delimiter 0x02 marks the last record.
  const padded = concat(plaintext, new Uint8Array([2]));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, key, padded as BufferSource),
  );

  // aes128gcm header: salt(16) || rs(4, big-endian) || idlen(1) || keyid(as_public)
  const rs = new Uint8Array([0, 0, 0x10, 0]); // 4096
  const header = concat(salt, rs, new Uint8Array([server.pubRaw.length]), server.pubRaw);
  return concat(header, ct);
}

/** VAPID Authorization header value for an endpoint. */
export async function vapidHeader(
  endpoint: string,
  subject: string,
  publicKeyB64url: string,
  privateJwk: JsonWebKey,
): Promise<string> {
  const { origin } = new URL(endpoint);
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud: origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject };
  const signingInput = `${bytesToB64url(enc.encode(JSON.stringify(header)))}.${bytesToB64url(enc.encode(JSON.stringify(payload)))}`;

  const key = await crypto.subtle.importKey("jwk", privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(signingInput)));
  const jwt = `${signingInput}.${bytesToB64url(sig)}`;
  return `vapid t=${jwt}, k=${publicKeyB64url}`;
}

export type PushSubscription = { endpoint: string; p256dh: string; auth: string };
export type Vapid = { subject: string; publicKey: string; privateJwk: JsonWebKey };

/** Sends one push. Returns the HTTP status; 404/410 mean the sub is dead. */
export async function sendPush(sub: PushSubscription, payload: object, vapid: Vapid): Promise<number> {
  const body = await encryptPayload(
    enc.encode(JSON.stringify(payload)),
    b64urlToBytes(sub.p256dh),
    b64urlToBytes(sub.auth),
  );
  const auth = await vapidHeader(sub.endpoint, vapid.subject, vapid.publicKey, vapid.privateJwk);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "1800",
    },
    body: body as BodyInit,
  });
  return res.status;
}

export const _test = { b64urlToBytes, bytesToB64url };
