/* ============================================
   Spark ERP — Dashboard Page Script
   Demo data only. Data layer arrives in Phase 2+.
   ============================================ */

import { initLayout } from "../modules/layout.js";

/* ---------- Demo data ---------- */

const STATS = {
  projects: { value: 42 },
  income: { value: 482500, prefix: "$" },
  expenses: { value: 315200, prefix: "$" },
  profit: { value: 167300, prefix: "$" },
};

/* ---------- Helpers ---------- */

const numFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function animateCount(el, value, prefix) {
  const duration = 800;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = (prefix || "") + numFmt.format(Math.round(value * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderStats() {
  document.querySelectorAll("[data-stat]").forEach((el) => {
    const stat = STATS[el.dataset.stat];
    if (!stat) return;
    animateCount(el, stat.value, el.dataset.prefix ?? stat.prefix ?? "");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await initLayout();
  renderStats();
});
