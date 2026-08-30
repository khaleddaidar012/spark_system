/* ============================================
   Spark ERP — Sync Status UI Badge Component
   Updates navbar status icon (🟢/🟡/⚪/⚠️) based on
   connectivity and sync queue states.
   ============================================ */

import { SyncQueueManager } from "../sync/sync-queue.js";
import { syncEngine } from "../sync/SyncEngine.js";

export function initSyncStatusBadge() {
  const iconEl = document.getElementById("syncBadgeIcon");
  const badgeBtn = document.getElementById("navSyncBadge");
  const progressBar = document.getElementById("navbarSyncProgress");
  if (!iconEl || !badgeBtn) return;

  const updateBadge = async (state) => {
    const pendingCount = await SyncQueueManager.getPendingCount();

    if (progressBar) {
      progressBar.classList.toggle("is-active", state === "syncing");
    }

    if (state === "syncing") {
      iconEl.textContent = "🟡";
      badgeBtn.title = "Syncing with cloud...";
    } else if (state === "error") {
      iconEl.textContent = "⚠️";
      badgeBtn.title = "Sync error — click to retry";
    } else if (!navigator.onLine) {
      iconEl.textContent = "⚪";
      badgeBtn.title = `Offline (${pendingCount} changes waiting to sync)`;
    } else {
      iconEl.textContent = pendingCount > 0 ? "🟡" : "🟢";
      badgeBtn.title = pendingCount > 0 ? `${pendingCount} changes pending sync (Click to Sync Now)` : "Online — Synced";
    }
  };

  badgeBtn.addEventListener("click", () => {
    if (navigator.onLine) {
      syncEngine.triggerSync();
    }
  });

  window.addEventListener("spark:connectivity-changed", (e) => {
    updateBadge(e.detail && e.detail.isServerReachable ? "online" : "offline");
  });

  window.addEventListener("spark:sync-status", (e) => {
    updateBadge(e.detail && e.detail.status);
  });

  updateBadge("init");
}
