// Offline cache for the Alaska Itinerary SPA.
//
// Strategy:
//   * Navigation requests (the HTML shell): network-first, fall back to the
//     cached shell so the app still boots without a connection.
//   * Same-origin GET assets (JS/CSS/images): cache-first, then network,
//     stashing every successful response so it's available next time.
//   * Cross-origin requests: pass through untouched.
//
// Bump CACHE_VERSION to force a fresh cache for all clients on next activate.

const CACHE_VERSION = "v3";
const CACHE_NAME = `alaska-itinerary-${CACHE_VERSION}`;
const SHELL_URL = new Request(self.registration.scope, { cache: "reload" });

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(SHELL_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(handleAsset(request));
  }
});

async function handleNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    cache.put(SHELL_URL, fresh.clone()).catch(() => {});
    return fresh;
  } catch {
    const cached =
      (await cache.match(request)) || (await cache.match(SHELL_URL));
    if (cached) return cached;
    return new Response(
      "<h1>Offline</h1><p>This page hasn't been cached yet.</p>",
      { status: 503, headers: { "Content-Type": "text/html" } }
    );
  }
}

async function handleAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok && fresh.type === "basic") {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}
