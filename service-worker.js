/* EjdEdart Service Worker v1.0 */
const CACHE_NAME = "ejdedart-v1.0";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/responsive.css",
  "./js/app.js",
  "./js/state.js",
  "./js/router.js",
  "./js/views/setup.js",
  "./js/views/players.js",
  "./js/views/game.js",
  "./js/ui/dartboard.js",
  "./js/logic/checkout.js",
  "./js/logic/rules.js",
  "./js/storage.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Network-first for navigation, cache-first for others
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});
