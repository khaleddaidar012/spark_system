/* ============================================
   Spark ERP — Service Worker Asset Caching Engine
   CacheFirst for Static Assets, Network/Fallback for API
   ============================================ */

const CACHE_NAME = "spark-erp-cache-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./pages/dashboard.html",
  "./pages/projects.html",
  "./pages/project.html",
  "./pages/finance.html",
  "./pages/suppliers.html",
  "./pages/contractors.html",
  "./pages/reports.html",
  "./pages/settings.html",
  "./pages/statement.html",
  "./pages/login.html",
  "./assets/vendor/dexie.mjs",
  "./assets/vendor/lucide/lucide.min.js",
  "./assets/js/modules/store.js",
  "./assets/js/modules/api.js",
  "./assets/js/modules/calc.js",
  "./assets/js/modules/auth.js",
  "./assets/js/db/db.js",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching static application shell assets");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Cache addAll warning:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Pass API calls directly to Network/Sync Engine
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // CacheFirst strategy for static HTML/CSS/JS assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for HTML navigation requests offline
        if (event.request.mode === "navigate") {
          return caches.match("./pages/dashboard.html");
        }
      });
    })
  );
});
