/* ============================================
   Spark ERP — Theme Module
   Handles Dark / Light mode and persists it.
   ============================================ */

const STORAGE_KEY = "spark_theme";
const LIGHT = "light";
const DARK = "dark";

function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || LIGHT;
  } catch {
    return LIGHT;
  }
}

function getPreferredTheme() {
  const stored = getStoredTheme();
  if (stored === DARK || stored === LIGHT) return stored;
  return LIGHT;
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelectorAll("[data-theme-icon]").forEach((icon) => {
    icon.style.display = icon.dataset.themeIcon === theme ? "" : "none";
  });
}

export function initTheme() {
  applyTheme(getPreferredTheme());
}

export function getTheme() {
  return getStoredTheme();
}

export function toggleTheme() {
  const next = getStoredTheme() === DARK ? LIGHT : DARK;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage unavailable — still apply for the session */
  }
  applyTheme(next);
  return next;
}
