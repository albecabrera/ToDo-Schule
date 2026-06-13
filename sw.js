// ========================================================================
//  ToDo-Schule — Service Worker (Offline-Cache + Push-Notifications)
// ========================================================================

const CACHE = "esg-todo-v7";

const PRECACHE = [
  "./",
  "./ToDo-Schule.html",
  "./manifest.webmanifest",
  "./app/config.js",
  "./dist/app.min.js",
  "./dist/chat.js",
  "./vendor/react.production.min.js",
  "./vendor/react-dom.production.min.js",
  "./vendor/heic2any.min.js",
  "./app/tokens.css",
  "./app/components.css",
  "./app/screens.css",
  "./app/overlays.css",
  "./app/responsive.css",
  "./app/notes.css",
  "./app/chat.css",
  "./assets/esg-mark.svg",
  "./assets/esg-mark-ondark.svg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Strategien:
   - /api/ und fremde Origins außer Fonts: gar nicht anfassen (Netz pur)
   - Navigation/HTML: network-first, Cache als Offline-Fallback
   - Statisches (CSS/JS/SVG/Fonts): stale-while-revalidate            */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

  // REST-API & andere Origins nie cachen (Echtzeit-Daten).
  if (url.pathname.startsWith("/api/")) return;
  if (url.origin !== self.location.origin && !isFont) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("./ToDo-Schule.html")))
    );
    return;
  }

  // App-Code (JS/CSS): network-first — Änderungen am Bundle greifen sofort,
  // Cache nur als Offline-Fallback. Verhindert "alter Code aus dem Cache".
  const isAppCode = url.pathname.endsWith(".js") || url.pathname.endsWith(".css");
  if (isAppCode && !isFont) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // stale-while-revalidate für statische Assets (Bilder, Fonts)
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

/* ── Push-Notifications ─────────────────────────────────────────────── */

/* Web-Push (z. B. künftig via VAPID vom Backend). Payload-Format:
   { "title": "...", "body": "...", "taskId": 123 } */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "ToDo-Schule", {
      body: data.body || "",
      icon: "assets/esg-mark.svg",
      badge: "assets/esg-mark.svg",
      tag: data.taskId ? `task-${data.taskId}` : undefined,
      data: { taskId: data.taskId || null },
    })
  );
});

/* Klick auf Notification: vorhandenes App-Fenster fokussieren, sonst öffnen. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if ("focus" in win) return win.focus();
      }
      return self.clients.openWindow("./ToDo-Schule.html");
    })
  );
});
