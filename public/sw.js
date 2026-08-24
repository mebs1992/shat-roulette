// Shat Roulette service worker.
// Keeps the app installable and offline-capable, and (when push is enabled)
// shows notifications the server sends.

// Bump this whenever the caching behaviour changes; `activate` deletes every
// other cache, so a stale one on an installed device is purged on next load.
const CACHE = "sr-v2";
const SHELL = ["/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

// The worker deliberately does NOT intercept page navigations, Next.js routing
// (RSC) payloads, API calls, or the websocket. Caching those served stale
// screens and broke client-side routing — the app must always talk to the
// network for anything dynamic. We only cache genuinely static, hashed assets
// (JS/CSS chunks, icons, fonts) so a repeat visit is a little faster and the
// icons survive a flaky connection.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  const isRSC = request.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  const isDynamic =
    request.mode === "navigate" ||
    isRSC ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/ws");
  if (isDynamic) return; // straight to the network, no SW involvement

  // Static asset: network-first, fall back to cache only when offline.
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request)),
  );
});

// A push from the server — "a friend invited you", "someone's on".
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Shat Roulette", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Shat Roulette";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
      tag: data.tag || "sr",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});
