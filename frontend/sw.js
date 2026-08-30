/* ============================================
   Spark ERP — Service Worker Asset Caching Engine
   CacheFirst for Static Assets, Network/Fallback for API
   ============================================ */

const CACHE_NAME = "spark-erp-cache-v5";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/sw.js",

  // Pages
  "/pages/login.html",
  "/pages/dashboard.html",
  "/pages/projects.html",
  "/pages/project.html",
  "/pages/finance.html",
  "/pages/suppliers.html",
  "/pages/contractors.html",
  "/pages/reports.html",
  "/pages/settings.html",
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

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log("[SW] Pre-caching all application assets in batches...");

      // Process pre-cache in controlled batches of 5 to avoid connection limits
      const batchSize = 5;
      for (let i = 0; i < STATIC_ASSETS.length; i += batchSize) {
        const batch = STATIC_ASSETS.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map(async (asset) => {
            try {
              const res = await fetch(asset, { cache: "no-cache" });
              if (res && (res.status === 200 || res.status === 0 || res.type === "opaque")) {
                await cache.put(asset, res);
              }
            } catch (err) {
              console.warn(`[SW] Pre-cache failed for ${asset}:`, err);
            }
          })
        );
      }
      console.log("[SW] System offline pre-cache complete!");
    })()
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
      // 1. Check exact match or path match from Cache Storage
      try {
        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;

        const pathCached = await caches.match(url.pathname, { ignoreSearch: true });
        if (pathCached) return pathCached;
      } catch (e) {}

      // 2. Try network fetch if online
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      } catch (err) {
        // 3. Network failed (OFFLINE): Guarantee HTML page response for navigation
        if (event.request.mode === "navigate" || (event.request.headers.get("accept") || "").includes("text/html")) {
          const cache = await caches.open(CACHE_NAME);
          const pageFallback =
            (await cache.match(url.pathname, { ignoreSearch: true })) ||
            (await cache.match(url.pathname + ".html", { ignoreSearch: true })) ||
            (await cache.match("/pages/dashboard.html")) ||
            (await cache.match("/pages/login.html")) ||
            (await cache.match("/pages/projects.html")) ||
            (await cache.match("/index.html")) ||
            (await cache.match("/"));
          if (pageFallback) return pageFallback;
        }
        throw err;
      }
    })()
  );
});




