/* ============================================
   Spark ERP — App Preloader & Caching Manager
   Pre-caches all static assets into CacheStorage
   and displays a sleek professional loader bar.
   ============================================ */

const PRECACHED_KEY = "spark_precache_completed_v10";

export function injectPreloader() {
  if (document.getElementById("app-preloader")) return;

  const isAr = (document.documentElement.lang || "ar") === "ar";
  const title = isAr ? "سبارك للهندسة" : "Spark Engineering ERP";
  const statusMsg = isAr
    ? "جارٍ تهيئة وحفظ بيانات النظام للعمل السريع أوفلاين..."
    : "Caching system assets for instant offline speed...";

  const html = `
    <div id="app-preloader" role="progressbar" aria-label="Loading">
      <div class="preloader-card">
        <div class="preloader-logo-ring">
          <div class="preloader-spinner"></div>
          <svg class="preloader-icon-svg" width="32" height="32" style="width:32px;height:32px;max-width:32px;max-height:32px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <h2 class="preloader-title">${title}</h2>
        <p class="preloader-subtitle" id="preloader-sub">${statusMsg}</p>
        <div class="preloader-progress-track">
          <div class="preloader-progress-bar" id="preloader-bar"></div>
        </div>
        <div class="preloader-status">
          <span id="preloader-status-text">Spark ERP</span>
          <span id="preloader-percent">0%</span>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("afterbegin", html);
}

export function setPreloaderProgress(percent, customMsg) {
  const bar = document.getElementById("preloader-bar");
  const percentEl = document.getElementById("preloader-percent");
  const subEl = document.getElementById("preloader-sub");

  const safePercent = Math.min(100, Math.max(0, Math.round(percent)));
  if (bar) bar.style.width = `${safePercent}%`;
  if (percentEl) percentEl.textContent = `${safePercent}%`;
  if (customMsg && subEl) subEl.textContent = customMsg;
}

export function hidePreloader(delay = 150) {
  setTimeout(() => {
    const el = document.getElementById("app-preloader");
    if (el) {
      el.classList.add("is-hidden");
      setTimeout(() => el.remove(), 350);
    }
  }, delay);
}

export function initAppPreloader() {
  injectPreloader();

  const isAlreadyCached = localStorage.getItem(PRECACHED_KEY) === "1";
  let targetProgress = isAlreadyCached ? 100 : 15;

  setPreloaderProgress(targetProgress);

  if (isAlreadyCached) {
    hidePreloader(200);
    return;
  }

  // Simulate smooth initial pre-cache progress bar until Service Worker sends PRECACHE_COMPLETE
  const interval = setInterval(() => {
    if (targetProgress < 90) {
      targetProgress += Math.floor(Math.random() * 15) + 5;
      setPreloaderProgress(targetProgress);
    }
  }, 120);

  const finish = () => {
    clearInterval(interval);
    setPreloaderProgress(100);
    try {
      localStorage.setItem(PRECACHED_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    hidePreloader(250);
  };

  // Listen for Service Worker pre-cache events
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "PRECACHE_PROGRESS") {
        const pct = Math.round((event.data.loaded / event.data.total) * 100);
        setPreloaderProgress(pct);
      }
      if (event.data && event.data.type === "PRECACHE_COMPLETE") {
        finish();
      }
    });
  }

  // Fallback timer so loader never stays stuck even if network is slow
  setTimeout(() => {
    finish();
  }, 2200);
}
