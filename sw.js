/* Dart Scorer - Service Worker (cache-first for static assets) */
const VERSION = "dart-scorer-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",

  // UI assets
  "./assets/background.jpg",
  "./assets/start.png",
  "./assets/back.png",
  "./assets/next.png",
  "./assets/chooseplayer.png",
  "./assets/settings.png",
  "./assets/vs.png",
  "./assets/winner.png",
  "./assets/newgame.png",

  // Icons
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png",

  // SFX
  "./assets/sfx/start.mp3",
  "./assets/sfx/score100.mp3",
  "./assets/sfx/win.mp3",
  "./assets/sfx/bust.mp3",

  // Players (best effort)
  "./assets/players/ludvig.jpg",
  "./assets/players/emelie.jpg",
  "./assets/players/joakim.jpg",
  "./assets/players/martin.jpg",
  "./assets/players/alva.jpg",
  "./assets/players/gast1.jpg",
  "./assets/players/gast2.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(APP_SHELL.map(u => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== VERSION) ? caches.delete(k) : Promise.resolve()));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);

    const cached = await cache.match(req, { ignoreSearch: true });
    if(cached) return cached;

    try{
      const fresh = await fetch(req);
      if(fresh && fresh.status === 200 && (fresh.type === "basic" || fresh.type === "cors")){
        cache.put(req, fresh.clone());
      }
      return fresh;
    }catch(e){
      if(req.mode === "navigate"){
        const fallback = await cache.match("./index.html");
        if(fallback) return fallback;
      }
      throw e;
    }
  })());
});
