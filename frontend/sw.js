/* ============================================
   Spark ERP — Service Worker Asset Caching Engine
   CacheFirst for Static Assets, Network/Fallback for API
   ============================================ */

const CACHE_NAME = "spark-erp-cache-v22";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/sw.js",

  // Pages (Both Clean URLs & .html)
  "/pages/login",
  "/pages/login.html",
  "/pages/dashboard",
  "/pages/dashboard.html",
  "/pages/projects",
  "/pages/projects.html",
  "/pages/project",
  "/pages/project.html",
  "/pages/finance",
  "/pages/finance.html",
  "/pages/suppliers",
  "/pages/suppliers.html",
  "/pages/contractors",
  "/pages/contractors.html",
  "/pages/reports",
  "/pages/reports.html",
  "/pages/settings",
  "/pages/settings.html",
  "/pages/statement",
  "/pages/statement.html",

  // Components
  "/components/sidebar.html",
  "/components/navbar.html",
  "/components/quick-add.html",

  // Translation JSONs
  "/data/i18n/ar.json",
  "/data/i18n/en.json",

  // Icons
  "/assets/icons/favicon.svg",

  // Vendor JS
  "/assets/vendor/dexie.mjs",
  "/assets/vendor/lucide/lucide.min.js",

  // CSS Files
  "/assets/css/main.css",
  "/assets/css/base/reset.css",
  "/assets/css/base/typography.css",
  "/assets/css/base/variables.css",
  "/assets/css/components/badge.css",
  "/assets/css/components/breadcrumb.css",
  "/assets/css/components/buttons.css",
  "/assets/css/components/cards.css",
  "/assets/css/components/charts.css",
  "/assets/css/components/empty-state.css",
  "/assets/css/components/forms.css",
  "/assets/css/components/icon.css",
  "/assets/css/components/invoice.css",
  "/assets/css/components/modal.css",
  "/assets/css/components/navbar.css",
  "/assets/css/components/placeholder.css",
  "/assets/css/components/preloader.css",
  "/assets/css/components/quick-add-modal.css",
  "/assets/css/components/quick-add.css",
  "/assets/css/components/sidebar.css",
  "/assets/css/components/toast.css",
  "/assets/css/layout/auth.css",
  "/assets/css/layout/layout.css",
  "/assets/css/pages/dashboard.css",
  "/assets/css/pages/finance.css",
  "/assets/css/pages/login.css",
  "/assets/css/pages/project.css",
  "/assets/css/pages/projects.css",
  "/assets/css/pages/reports.css",
  "/assets/css/pages/settings.css",
  "/assets/css/pages/statement.css",

  // JS Modules & Scripts
  "/assets/js/components/sync-status-badge.js",
  "/assets/js/db/db.js",
  "/assets/js/db/storage-health.js",
  "/assets/js/modules/actions.js",
  "/assets/js/modules/api.js",
  "/assets/js/modules/auth.js",
  "/assets/js/modules/backup.js",
  "/assets/js/modules/calc.js",
  "/assets/js/modules/i18n.js",
  "/assets/js/modules/layout.js",
  "/assets/js/modules/modal.js",
  "/assets/js/modules/person-roles.js",
  "/assets/js/modules/person-statement.js",
  "/assets/js/modules/phases-catalog.js",
  "/assets/js/modules/preloader.js",
  "/assets/js/modules/project-phases.js",
  "/assets/js/modules/quick-add-person.js",
  "/assets/js/modules/quick-add.js",
  "/assets/js/modules/store.js",
  "/assets/js/modules/theme.js",
  "/assets/js/modules/toast.js",
  "/assets/js/modules/uuid.js",
  "/assets/js/pages/contractors.js",
  "/assets/js/pages/dashboard.js",
  "/assets/js/pages/finance.js",
  "/assets/js/pages/login.js",
  "/assets/js/pages/project.js",
  "/assets/js/pages/projects.js",
  "/assets/js/pages/reports.js",
  "/assets/js/pages/settings.js",
  "/assets/js/pages/statement.js",
  "/assets/js/pages/suppliers.js",
  "/assets/js/repositories/base-repository.js",
  "/assets/js/repositories/FinanceRepository.js",
  "/assets/js/repositories/PersonRepository.js",
  "/assets/js/repositories/StockRepository.js",
  "/assets/js/repositories/ProjectRepository.js",
  "/assets/js/sync/ConnectivityMonitor.js",
  "/assets/js/sync/sync-queue.js",
  "/assets/js/sync/SyncEngine.js"
];

async function broadcastToClients(msg) {
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
    clients.forEach((client) => client.postMessage(msg));
  } catch {
    /* ignore */
  }
}

async function preCacheAllAssets() {
  try {
    const cache = await caches.open(CACHE_NAME);
    console.log("[SW] Pre-caching all 80+ application assets...");

    let loaded = 0;
    const total = STATIC_ASSETS.length;
    const batchSize = 5;

    for (let i = 0; i < STATIC_ASSETS.length; i += batchSize) {
      const batch = STATIC_ASSETS.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (asset) => {
          try {
            const res = await fetch(asset, { redirect: "follow", cache: "no-cache" });
            if (res && (res.status === 200 || res.ok)) {
              const blob = await res.blob();
              const cleanRes = new Response(blob, {
                status: 200,
                statusText: "OK",
                headers: res.headers,
              });
              await cache.put(asset, cleanRes);
            }
          } catch (err) {
            console.warn(`[SW] Pre-cache failed for ${asset}:`, err);
          } finally {
            loaded++;
            broadcastToClients({ type: "PRECACHE_PROGRESS", loaded, total });
          }
        })
      );
    }
    console.log("[SW] Complete pre-cache finished successfully!");
    broadcastToClients({ type: "PRECACHE_COMPLETE" });
  } catch (e) {
    console.error("[SW] Pre-cache error:", e);
  }
}

async function getCachedAsset(request, url) {
  // 1. Try exact request match
  let res = await caches.match(request, { ignoreSearch: true });
  if (res) return res;

  // 2. Try pathname match
  res = await caches.match(url.pathname, { ignoreSearch: true });
  if (res) return res;

  // 3. Try pathname + .html match (e.g. /pages/dashboard -> /pages/dashboard.html)
  if (!url.pathname.endsWith(".html") && !url.pathname.endsWith(".js") && !url.pathname.endsWith(".css") && !url.pathname.endsWith(".json") && !url.pathname.endsWith(".svg")) {
    res = await caches.match(url.pathname + ".html", { ignoreSearch: true });
    if (res) return res;
  }

  // 4. Try pathname without .html match (e.g. /pages/dashboard.html -> /pages/dashboard)
  if (url.pathname.endsWith(".html")) {
    const cleanPath = url.pathname.slice(0, -5);
    res = await caches.match(cleanPath, { ignoreSearch: true });
    if (res) return res;
  }

  // 5. Try trailing slash / index.html
  if (url.pathname.endsWith("/")) {
    res = (await caches.match(url.pathname + "index.html", { ignoreSearch: true })) ||
          (await caches.match(url.pathname + "pages/dashboard.html", { ignoreSearch: true }));
    if (res) return res;
  }

  return null;
}

self.addEventListener("install", (event) => {
  event.waitUntil(preCacheAllAssets());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
      preCacheAllAssets();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PRECACHE_ALL") {
    preCacheAllAssets();
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Pass API calls directly to Network / Sync Engine (IndexedDB)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // 1. CACHE FIRST: Try finding in cache immediately (0ms latency, works offline)
      const cachedResponse = await getCachedAsset(event.request, url);
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. NETWORK FALLBACK if not in cache
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && (networkResponse.status === 200 || networkResponse.ok)) {
          const clone = networkResponse.clone();
          cache.put(event.request, clone);
        }
        return networkResponse;
      } catch (err) {
        // 3. OFFLINE NAVIGATION FALLBACK: Return any cached HTML shell
        if (event.request.mode === "navigate" || (event.request.headers.get("accept") || "").includes("text/html")) {
          const fallback =
            (await cache.match(url.pathname, { ignoreSearch: true })) ||
            (await cache.match(url.pathname + ".html", { ignoreSearch: true })) ||
            (await cache.match("/pages/dashboard.html")) ||
            (await cache.match("/pages/dashboard")) ||
            (await cache.match("/pages/login.html")) ||
            (await cache.match("/pages/login")) ||
            (await cache.match("/pages/projects.html")) ||
            (await cache.match("/pages/projects")) ||
            (await cache.match("/index.html")) ||
            (await cache.match("/"));
          if (fallback) return fallback;
        }
        throw err;
      }
    })()
  );
});
