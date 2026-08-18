/**
 * Service worker de Routin.
 *
 * Périmètre actuel (lot 1) : mise en cache du shell applicatif pour que
 * l'application s'ouvre hors-ligne. Les données, elles, vivront dans IndexedDB
 * côté client (lot 7) — ce fichier ne met JAMAIS en cache les réponses d'API,
 * sinon une réponse périmée écraserait l'état local, qui fait autorité.
 */

const VERSION = "v1";
const SHELL_CACHE = `routin-shell-${VERSION}`;
const ASSET_CACHE = `routin-assets-${VERSION}`;
const OFFLINE_URL = "/hors-ligne";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Jamais de cache sur l'API ni sur l'authentification.
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ?? caches.match(OFFLINE_URL);
        }),
    );
  }
});

/* ── Notifications ──────────────────────────────────────────────────────────
   Le `tag` vaut « tâche + jour » : si un rappel arrive deux fois, la seconde
   notification remplace la première au lieu de s'empiler.
   ------------------------------------------------------------------------ */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Routin", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Routin", {
      body: payload.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag,
      renotify: false,
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";

  // On réutilise une fenêtre déjà ouverte plutôt que d'en empiler une nouvelle
  // à chaque notification touchée.
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
