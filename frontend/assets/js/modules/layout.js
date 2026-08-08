/* ============================================
   Spark ERP — App Layout Module
   Loads reusable sidebar + navbar, wires active
   menu, breadcrumb, sidebar toggle/collapse, and
   theme / language toggles in the navbar.
   ============================================ */

import { initTheme, toggleTheme } from "./theme.js";
import { initI18n, getLang, toggleLanguage } from "./i18n.js";
import { initQuickAdd } from "./quick-add.js";
import { initModalManager } from "./modal.js";
import { maybeAutoBackup } from "./backup.js";

const SIDEBAR_KEY = "spark_sidebar_collapsed";

const PAGE_META = {
  dashboard: { title: "Dashboard" },
  projects: { title: "Projects" },
  suppliers: { title: "Suppliers" },
  finance: { title: "Financial Accounts" },
  contractors: { title: "Contractors" },
  reports: { title: "Reports" },
  settings: { title: "Settings" },
};

async function loadComponent(id, url) {
  const host = document.getElementById(id);
  if (!host) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    host.innerHTML = await res.text();
  } catch {
    host.innerHTML = "";
  }
}

function initThemeToggle() {
  document.getElementById("navThemeToggle")?.addEventListener("click", toggleTheme);
}

function initLangToggle() {
  const btn = document.getElementById("navLangToggle");
  if (!btn) return;
  const applyLabel = () => {
    btn.textContent = document.documentElement.lang === "ar" ? "EN" : "ع";
  };
  applyLabel();
  btn.addEventListener("click", async () => {
    await toggleLanguage();
    applyLabel();
  });
}

function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const openBtn = document.getElementById("sidebarToggle");
  const closeBtn = document.getElementById("sidebarClose");

  const open = () => {
    sidebar?.classList.add("is-open");
    backdrop?.classList.add("is-visible");
  };

  const close = () => {
    sidebar?.classList.remove("is-open");
    backdrop?.classList.remove("is-visible");
  };

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);

  const collapseBtn = document.getElementById("sidebarCollapse");
  const isCollapsed = () => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "1";
    } catch {
      return false;
    }
  };

  const applyCollapsed = (collapsed) => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  };

  applyCollapsed(isCollapsed());
  collapseBtn?.addEventListener("click", () => {
    applyCollapsed(!document.body.classList.contains("sidebar-collapsed"));
  });
}

function highlightActiveMenu() {
  const current = document.body.dataset.page || "dashboard";
  document.querySelectorAll(".sidebar-link[data-page]").forEach((link) => {
    const isActive = link.dataset.page === current;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function renderBreadcrumb() {
  const crumb = document.getElementById("breadcrumb");
  if (!crumb) return;
  const current = document.body.dataset.page || "dashboard";
  const meta = PAGE_META[current] || PAGE_META.dashboard;
  crumb.innerHTML = `
    <span class="breadcrumb-item"><a href="./dashboard.html" data-i18n="breadcrumb.home">Home</a></span>
    <span class="breadcrumb-item is-current" data-i18n="nav.${current}">${meta.title}</span>
  `;
}

async function loadQuickAdd() {
  const host = document.createElement("div");
  host.id = "quick-add-root";
  document.body.appendChild(host);
  const res = await fetch("../components/quick-add.html");
  if (res.ok) host.innerHTML = await res.text();
  window.lucide?.createIcons();
  initQuickAdd();
}

export async function initLayout() {
  await loadComponent("sidebar-root", "../components/sidebar.html");
  await loadComponent("navbar-root", "../components/navbar.html");
  await loadQuickAdd();
  initTheme();
  initSidebar();
  initThemeToggle();
  initLangToggle();
  highlightActiveMenu();
  renderBreadcrumb();
  initModalManager();
  await initI18n();
  maybeAutoBackup();
}

export { getLang };
