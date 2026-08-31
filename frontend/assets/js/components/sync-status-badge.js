/* ============================================
   Spark ERP — Sync Status Badge & Panel
   Uses SyncState for reliable state management.
   Navbar progress bar with real % fill,
   Pending count badge, sync panel with retry/Sync Now.
   ============================================ */

import { SyncQueueManager } from "../sync/sync-queue.js";
import { syncEngine } from "../sync/SyncEngine.js";
import { SyncState } from "../modules/state.js";

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
    panelNow:   document.getElementById("syncPanelNow"),
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
    progressWrap.classList.add("is-indeterminate");
    if (progressFill) progressFill.style.width = "0%";
  } else {
    progressWrap.classList.remove("is-indeterminate");
    if (progressFill) progressFill.style.width = `${Math.max(2, percent)}%`;
  }
}

function deviceIcon() {
  return SyncState.get().deviceType === "phone" ? "📱" : "💻";
}

function updateBadgeFromState(state) {
  const { iconEl, badgeBtn, countEl } = refs();
  if (!iconEl || !badgeBtn) return;

  SyncQueueManager.getPendingCount().then((pendingCount) => {
    /* Pending count pill */
    if (countEl) {
      if (pendingCount > 0 && state.syncStatus !== "synced") {
        countEl.textContent = pendingCount > 99 ? "99+" : String(pendingCount);
        countEl.hidden = false;
      } else {
        countEl.hidden = true;
      }
    }

    const icon = deviceIcon();

    if (state.syncStatus === "syncing") {
      iconEl.textContent = `${icon} 🟡`;
      badgeBtn.title = `جاري المزامنة...`;
    } else if (state.syncStatus === "error") {
      iconEl.textContent = `${icon} ⚠️`;
      badgeBtn.title = "خطأ في المزامنة — انقر للمحاولة مجدداً";
    } else if (!state.isOnline) {
      iconEl.textContent = `${icon} ⚪`;
      badgeBtn.title = `غير متصل (${pendingCount} تغيير معلق)`;
    } else if (pendingCount > 0) {
      iconEl.textContent = `${icon} 🟡`;
      badgeBtn.title = `${pendingCount} تغيير ينتظر المزامنة (انقر للمزامنة)`;
    } else {
      const lastSyncLabel = fmtLastSync(state.lastSyncAt);
      iconEl.textContent = `${icon} 🟢`;
      badgeBtn.title = lastSyncLabel ? `متصل ومتزامن — ${lastSyncLabel}` : "متصل ومتزامن";
    }
  });
}

function updateSyncPanelFromState(state) {
  const { panel, panelTitle, panelBar, panelPct, panelDetail, panelRetry, panelNow } = refs();
  if (!panel) return;

  if (state.syncStatus === "syncing") {
    if (!_panelVisible) showPanel();
    panelTitle.textContent = "🔄 جاري المزامنة...";
    if (panelRetry) panelRetry.hidden = true;
    if (panelNow) panelNow.hidden = true;
    if (panelBar) panelBar.style.width = "50%";
    if (panelPct) panelPct.textContent = "50%";
    if (panelDetail) panelDetail.textContent = "يتم رفع التغييرات وحفظها في السيرفر...";
  } else if (state.syncStatus === "synced") {
    if (panelBar) panelBar.style.width = "100%";
    if (panelPct) panelPct.textContent = "100%";
    if (panelTitle) panelTitle.textContent = "✅ تمت المزامنة بنجاح!";
    if (panelDetail) panelDetail.textContent = fmtLastSync(state.lastSyncAt);
    if (panelRetry) panelRetry.hidden = true;
    if (panelNow) panelNow.hidden = false;
    if (_panelVisible) {
      _panelAutoCloseTimer = setTimeout(() => hidePanel(), 3000);
    }
  } else if (state.syncStatus === "error") {
    if (panelTitle) panelTitle.textContent = "⚠️ فشلت المزامنة";
    if (panelDetail) panelDetail.textContent = state.error || "تحقق من اتصالك وأعد المحاولة";
    if (panelRetry) panelRetry.hidden = false;
    if (panelNow) panelNow.hidden = false;
  } else if (!state.isOnline) {
    if (panelTitle) panelTitle.textContent = "📡 وضع غير متصل";
    if (panelDetail) panelDetail.textContent = "بياناتك محفوظة محلياً. ستتم المزامنة فجاءة الاتصال.";
    if (panelRetry) panelRetry.hidden = true;
    if (panelNow) panelNow.hidden = true;
  }
}

/* Subscribe to SyncState — primary state source */
SyncState.subscribe((state) => {
  updateBadgeFromState(state);
  updateSyncPanelFromState(state);
  if (state.syncStatus === "syncing" || state.syncStatus === "synced") {
    setNavbarProgress(
      state.syncStatus === "syncing" ? null : 100,
      state.syncStatus === "syncing"
    );
  }
});

export function initSyncStatusBadge() {
  const r = refs();
  if (!r.iconEl || !r.badgeBtn) return;

  /* Badge click → manual sync trigger */
  r.badgeBtn.addEventListener("click", () => {
    if (navigator.onLine) {
      syncEngine.forceSync();
      showPanel();
    }
  });

  /* Panel close */
  r.panelClose?.addEventListener("click", () => hidePanel());

  /* Panel retry */
  r.panelRetry?.addEventListener("click", () => {
    syncEngine.forceSync();
  });

  /* Panel "Sync Now" button */
  r.panelNow?.addEventListener("click", () => {
    if (navigator.onLine) {
      syncEngine.forceSync();
    }
  });

  /* Initial render */
  updateBadgeFromState(SyncState.get());
  updateSyncPanelFromState(SyncState.get());
}
