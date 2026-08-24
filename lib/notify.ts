import { db, env } from "./db";
import { sendPush, type PushSubscription, type Vapid } from "./webpush";

async function vapid(): Promise<Vapid | null> {
  const e = await env();
  if (!e.VAPID_PRIVATE_JWK || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return null;
  try {
    return {
      subject: e.VAPID_SUBJECT ?? "mailto:admin@example.com",
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      privateJwk: JSON.parse(e.VAPID_PRIVATE_JWK) as JsonWebKey,
    };
  } catch {
    return null;
  }
}

/** Push a notification to every device a user has registered. Best-effort. */
export async function notify(userId: string, payload: { title: string; body: string; url?: string; tag?: string }): Promise<void> {
  const v = await vapid();
  if (!v) return;
  const database = await db();
  const subs = await database
    .prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?")
    .bind(userId)
    .all<PushSubscription>();

  await Promise.all(
    (subs.results ?? []).map(async (sub) => {
      try {
        const status = await sendPush(sub, payload, v);
        // 404/410 mean the subscription is dead — drop it.
        if (status === 404 || status === 410) {
          await database.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(sub.endpoint).run();
        }
      } catch {
        /* one dead endpoint must not stop the others */
      }
    }),
  );
}
