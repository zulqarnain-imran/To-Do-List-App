/*
 * Luma Tasks service worker.
 *
 * Strategy, chosen per resource type:
 *
 *   navigations   network-first, falling back to cache and then /offline.
 *                 A task app must show live data when the network is there, and
 *                 still say something useful when it is not.
 *   static assets cache-first. Hashed build output is immutable, so there is no
 *                 reason to revalidate it.
 *   API           network-only. Task and account responses are private and
 *                 frequently changed; serving one from a cache would show
 *                 stale or, worse, the wrong data.
 *
 * Nothing is cached for signed-in API routes, so the offline cache can never
 * leak one account's data to another on a shared device.
 */

const VERSION = "luma-v1";
const OFFLINE_URL = "/offline";

const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      // A single missing file must not block activation.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache account data.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ?? (await caches.match(OFFLINE_URL)) ?? Response.error();
        }),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.match(/\.(?:css|js|woff2?|png|svg|webp)$/)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            // Opaque or error responses are not worth keeping.
            if (response.ok && response.type === "basic") {
              const copy = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
