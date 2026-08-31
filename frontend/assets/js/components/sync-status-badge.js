/* ============================================
   Spark ERP — Sync Status Badge & Panel
   - Navbar progress bar with real % fill
   - Pending count badge on sync button
   - Sync Panel: shows on offline→online transition
     with real progress %, detail text, retry btn
   - Last sync time display
   ============================================ */

import { SyncQueueManager } from "../sync/sync-queue.js";
import { syncEngine } from "../sync/SyncEngine.js";

let _panelVisible = false;
let _panelAutoCloseTimer = null;

/* ---- Cached DOM refs ---- */
function refs() {
  return {
    iconEl:     document.getElementById("syncBadgeIcon"),
    badgeBtn:   document.getElementById("navSyncBadge"),
    countEl:    document.getElementById("syncBadgeCount"),
    progressWrap: document.getElementById("navbarSyncProgress"),
    progressFill: document.getElementById("navbarSyncProgressFill"),
    panel:      document.getElementById("syncPanel"),
    panelTitle: document.getElementById("syncPanelTitle"),
    panelBar:   document.getElementById("syncPanelBar"),
    panelPct:   document.getElementById("syncPanelPercent"),
    panelDetail:document.getElementById("syncPanelDetail"),
    panelClose: document.getElementById("syncPanelClose"),
    panelRetry: document.getElementById("syncPanelRetry"),
  };
}

/* ---- Helpers ---- */

function fmtLastSync(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return `آخر مزامنة: منذ ${diff} ث`;
  if (diff < 3600) return `آخر مزامنة: منذ ${Math.floor(diff / 60)} د`;
  return `آخر مزامنة: منذ ${Math.floor(diff / 3600)} س`;
}

function showPanel() {
  const { panel } = refs();
  if (!panel) return;
  panel.hidden = false;
  _panelVisible = true;
  window.lucide?.createIcons({ el: panel });
}

function hidePanel() {
  const { panel } = refs();
  if (!panel) return;
  panel.hidden = true;
  _panelVisible = false;
  if (_panelAutoCloseTimer) clearTimeout(_panelAutoCloseTimer);
}

function setNavbarProgress(percent, active) {
  const { progressWrap, progressFill } = refs();
  if (!progressWrap) return;

  if (!active) {
    progressWrap.classList.remove("is-active", "is-indeterminate");
    return;
  }

  progressWrap.classList.add("is-active");

  if (percent === null) {
    /* No percent info yet — show shimmer */
    progressWrap.classList.add("is-indeterminate");
    if (progressFill) progressFill.style.width = "0%";
  } else {
    progressWrap.classList.remove("is-indeterminate");
    if (progressFill) progressFill.style.width = `${Math.max(2, percent)}%`;
  }
}

async function updateBadge(state, detail = {}) {
  const { iconEl, badgeBtn, countEl } = refs();
  if (!iconEl || !badgeBtn) return;

  const pendingCount = await SyncQueueManager.getPendingCount();

  /* Pending count pill */
  if (countEl) {
    if (pendingCount > 0 && state !== "synced") {
      countEl.textContent = pendingCount > 99 ? "99+" : String(pendingCount);
      countEl.hidden = false;
    } else {
      countEl.hidden = true;
    }
  }

  if (state === "syncing") {
    iconEl.textContent = "🟡";
    badgeBtn.title = `جاري المزامنة... ${detail.percent != null ? detail.percent + "%" : ""}`;
  } else if (state === "error") {
    iconEl.textContent = "⚠️";
    badgeBtn.title = "خطأ في المزامنة — انقر للمحاولة مجدداً";
  } else if (!navigator.onLine) {
    iconEl.textContent = "⚪";
    badgeBtn.title = `غير متصل (${pendingCount} تغيير معلق)`;
  } else if (pendingCount > 0) {
    iconEl.textContent = "🟡";
    badgeBtn.title = `${pendingCount} تغيير ينتظر المزامنة (انقر للمزامنة)`;
  } else {
    const lastSyncLabel = fmtLastSync(syncEngine.lastSyncAt);
    iconEl.textContent = "🟢";
    badgeBtn.title = lastSyncLabel ? `متصل ومتزامن — ${lastSyncLabel}` : "متصل ومتزامن";
  }
}

function updateSyncPanel(state, detail = {}) {
  const { panel, panelTitle, panelBar, panelPct, panelDetail, panelRetry } = refs();
  if (!panel) return;

  const { percent = null, pushed = 0, total = 0 } = detail;

  if (state === "syncing") {
    /* Only show panel if there are actual pending changes */
    if (!_panelVisible && total > 0) showPanel();

    panelTitle.textContent = "🔄 جاري المزامنة...";
    if (panelRetry) panelRetry.hidden = true;

    const pct = percent != null ? Math.max(1, percent) : 1;
    if (panelBar)  panelBar.style.width  = `${pct}%`;
    if (panelPct)  panelPct.textContent  = `${pct}%`;
    if (panelDetail) {
      panelDetail.textContent = total > 0
        ? `تم رفع ${pushed} من ${total} تغيير`
        : "يتم التحقق من التحديثات...";
    }
  } else if (state === "synced") {
    if (panelBar)  panelBar.style.width  = "100%";
    if (panelPct)  panelPct.textContent  = "100%";
    if (panelTitle) panelTitle.textContent = "✅ تمت المزامنة بنجاح!";
    if (panelDetail) panelDetail.textContent = fmtLastSync(syncEngine.lastSyncAt);
    if (panelRetry) panelRetry.hidden = true;

    /* Auto-close panel after 3 seconds on success */
    if (_panelVisible) {
      _panelAutoCloseTimer = setTimeout(() => hidePanel(), 3000);
    }

  } else if (state === "error") {
    if (panelTitle) panelTitle.textContent = "⚠️ فشلت المزامنة";
    if (panelDetail) panelDetail.textContent = detail.error || "تحقق من اتصالك وأعد المحاولة";
    if (panelRetry) panelRetry.hidden = false;
  }
}

export function initSyncStatusBadge() {
  const r = refs();
  if (!r.iconEl || !r.badgeBtn) return;

  /* Badge click → manual sync trigger */
  r.badgeBtn.addEventListener("click", () => {
    if (navigator.onLine) {
      syncEngine.forceResetSync();
      syncEngine.triggerSync();
      showPanel();
    }
  });

  /* Panel close */
  r.panelClose?.addEventListener("click", () => hidePanel());

  /* Panel retry */
  r.panelRetry?.addEventListener("click", () => {
    syncEngine.forceResetSync();
    syncEngine.triggerSync();
  });

  /* Connectivity changes */
  window.addEventListener("spark:connectivity-changed", (e) => {
    const online = e.detail && e.detail.isServerReachable;
    updateBadge(online ? "online" : "offline");
    setNavbarProgress(0, false);
  });

  /* Reconnection: check pending and show panel if needed */
  window.addEventListener("spark:reconnected", async () => {
    const count = await SyncQueueManager.getPendingCount();
    if (count > 0) showPanel();
  });

  /* Real sync progress events from SyncEngine */
  window.addEventListener("spark:sync-status", (e) => {
    const { status, percent, pushed, total, error } = e.detail || {};
    updateBadge(status, { percent });
    updateSyncPanel(status, { percent, pushed, total, error });

    if (status === "syncing") {
      setNavbarProgress(percent, true);
    } else {
      /* Brief delay before hiding so 100% is visible */
      setTimeout(() => setNavbarProgress(100, false), 600);
    }
  });

  /* Initial badge state */
  updateBadge("init");
}
