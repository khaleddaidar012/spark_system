/* ============================================
   Spark ERP — App Layout Module
   Loads reusable sidebar + navbar, wires active
   menu, breadcrumb, sidebar toggle/collapse, and
   theme / language toggles in the navbar.
   ============================================ */

import { initTheme, toggleTheme } from "./theme.js";

const LANG_KEY = "spark_lang";
const SIDEBAR_KEY = "spark_sidebar_collapsed";

const PAGE_META = {
  dashboard: { title: "Dashboard", file: "./dashboard.html" },
  projects: { title: "Projects", file: "./projects.html" },
  materials: { title: "Materials", file: "./materials.html" },
  finance: { title: "Finance", file: "./finance.html" },
  clients: { title: "Clients", file: "./clients.html" },
  suppliers: { title: "Suppliers", file: "./suppliers.html" },
  workers: { title: "Workers", file: "./workers.html" },
  reports: { title: "Reports", file: "./reports.html" },
  settings: { title: "Settings", file: "./settings.html" },
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

function applyLang(lang) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === "ar" ? "rtl" : "ltr";
  const btn = document.getElementById("navLangToggle");
  if (btn) btn.textContent = lang === "ar" ? "EN" : "ع";
}

function initThemeToggle() {
  const btn = document.getElementById("navThemeToggle");
  btn?.addEventListener("click", toggleTheme);
}

function initLangToggle() {
  let lang;
  try {
    lang = localStorage.getItem(LANG_KEY) || "en";
  } catch {
    lang = "en";
  }
  applyLang(lang);
  document.getElementById("navLangToggle")?.addEventListener("click", () => {
    const next = document.documentElement.lang === "ar" ? "en" : "ar";
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* storage unavailable */
    }
    applyLang(next);
  });
}

function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const openBtn = document.getElementById("sidebarToggle");
  const closeBtn = document.getElementById("sidebarClose");

  const open = () => {
    sidebar?.classList.add("is-open");
    backdrop?.classList.remove("hidden");
    requestAnimationFrame(() => backdrop?.classList.add("is-visible"));
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
  const meta = PAGE_META[current] || { title: "Dashboard", file: "./dashboard.html" };
  crumb.innerHTML = `
    <span class="breadcrumb-item"><a href="./dashboard.html">Home</a></span>
    <span class="breadcrumb-item is-current">${meta.title}</span>
  `;
}

function initSearch() {
  const input = document.querySelector(".navbar-search-input");
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      // Global search is implemented in a later phase.
      input.blur();
    }
  });
}

export async function initLayout() {
  initTheme();
  await loadComponent("sidebar-root", "../components/sidebar.html");
  await loadComponent("navbar-root", "../components/navbar.html");
  window.lucide?.createIcons();
  initSidebar();
  initThemeToggle();
  initLangToggle();
  highlightActiveMenu();
  renderBreadcrumb();
  initSearch();
}
