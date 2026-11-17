// Service worker: lets the app open without internet, and shows expiry notifications.
// Bump VERSION when the list of app files changes.
const VERSION = "v7";
const APP = "freezerino-app-" + VERSION;
const LIBS = "freezerino-libs-v1";      // Firebase SDK + fonts (versioned URLs, never change)
const FB = "https://www.gstatic.com/firebasejs/10.14.1/";

const APP_FILES = [
  "./", "index.html", "style.css", "app.js", "store.js", "seed.js", "categories.js", "foods.js", "manifest.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];
const LIB_FILES = ["firebase-app.js", "firebase-auth.js", "firebase-firestore.js", "firebase-messaging.js"].map(f => FB + f);

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const app = await caches.open(APP);
    await app.addAll(APP_FILES.map(u => new Request(u, { cache: "reload" })));
    const libs = await caches.open(LIBS);
    await Promise.all(LIB_FILES.map(u => libs.add(new Request(u, { mode: "cors" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== APP && k !== LIBS) await caches.delete(k);
    await self.clients.claim();
  })());
});

const isLib = url =>
  url.startsWith("https://www.gstatic.com/firebasejs/") ||
  url.startsWith("https://fonts.googleapis.com/") ||
  url.startsWith("https://fonts.gstatic.com/");

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Libraries and fonts: cache first, they never change at the same URL.
  if (isLib(req.url)) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") (await caches.open(LIBS)).put(req, res.clone());
      return res;
    })());
    return;
  }

  // The app's own files: try the network (fresh code), fall back to the saved copy when offline or slow.
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(APP);
      try {
        const res = await Promise.race([
          fetch(req.mode === "navigate" ? req.url : req, { cache: "no-cache" }),
          new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), 4000)),
        ]);
        if (res.ok && url.search === "") cache.put(req, res.clone());
        return res;
      } catch {
        const hit = await cache.match(req, { ignoreSearch: true }) ||
          (req.mode === "navigate" ? await cache.match("index.html") : null);
        if (hit) return hit;
        throw new Error("offline");
      }
    })());
  }
  // Everything else (Firestore, Auth) goes straight to the network; Firestore has its own offline cache.
});

/* ---------- expiry notifications (sent by the daily GitHub job through Firebase Cloud Messaging) ---------- */

self.addEventListener("push", e => {
  let msg = {};
  try { msg = e.data ? e.data.json() : {}; } catch { msg = { body: e.data && e.data.text() }; }
  const d = msg.data || msg.notification || msg;
  const title = d.title || "Freezerino";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: d.tag || "freezerino-expiry",
    data: { url: d.url || "./#freezer" },
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) { await w.focus(); return w.navigate ? w.navigate(target).catch(() => {}) : null; }
    }
    return self.clients.openWindow(target);
  })());
});
