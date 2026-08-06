/* ============================================
   Spark ERP — Modal Manager
   Centralizes open/close, ESC key, click-outside
   and body scroll lock for all modal overlays.
   ============================================ */

const openModals = [];

function lockScroll() {
  document.body.classList.add("modal-open");
}

function unlockScroll() {
  if (openModals.length === 0) {
    document.body.classList.remove("modal-open");
  }
}

export function showModal(overlay) {
  if (!overlay) return;
  overlay.hidden = false;
  if (!openModals.includes(overlay)) openModals.push(overlay);
  lockScroll();
  const focusable = overlay.querySelector("input, select, textarea, button:not([hidden])");
  if (focusable) {
    setTimeout(() => focusable.focus(), 0);
  }
}

export function hideModal(overlay) {
  if (!overlay) return;
  overlay.hidden = true;
  const idx = openModals.indexOf(overlay);
  if (idx !== -1) openModals.splice(idx, 1);
  unlockScroll();
}

export function initModalManager() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openModals.length) {
      hideModal(openModals[openModals.length - 1]);
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("modal-overlay")) {
      hideModal(e.target);
    }
  });
}
