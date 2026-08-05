/* ============================================
   Spark ERP — Login Page Script
   ============================================ */

import { initTheme, toggleTheme } from "../modules/theme.js";

const REMEMBER_KEY = "spark_remembered_user";
const LANG_KEY = "spark_lang";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  /* ---------- Theme toggle ---------- */
  const themeToggle = document.getElementById("themeToggle");
  themeToggle?.addEventListener("click", toggleTheme);

  /* ---------- Language toggle (placeholder until i18n phase) ---------- */
  const langToggle = document.getElementById("langToggle");
  const html = document.documentElement;
  const applyLang = (lang) => {
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";
    langToggle.textContent = lang === "ar" ? "EN" : "ع";
  };
  applyLang(localStorage.getItem(LANG_KEY) || "en");
  langToggle?.addEventListener("click", () => {
    const next = html.lang === "ar" ? "en" : "ar";
    localStorage.setItem(LANG_KEY, next);
    applyLang(next);
  });

  /* ---------- Show / hide password ---------- */
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("togglePassword");
  const iconEye = document.getElementById("iconEye");
  const iconEyeOff = document.getElementById("iconEyeOff");

  togglePassword?.addEventListener("click", () => {
    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    iconEye.style.display = isVisible ? "" : "none";
    iconEyeOff.style.display = isVisible ? "none" : "";
    togglePassword.setAttribute(
      "aria-label",
      isVisible ? "Show password" : "Hide password"
    );
  });

  /* ---------- Remember me (prefill) ---------- */
  const usernameInput = document.getElementById("username");
  const rememberMe = document.getElementById("rememberMe");
  try {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      usernameInput.value = saved;
      rememberMe.checked = true;
    }
  } catch {
    /* storage unavailable */
  }

  /* ---------- Form validation (UI only, no real auth yet) ---------- */
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    errorBox.hidden = true;

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
      errorBox.textContent = "Please enter your username and password.";
      errorBox.hidden = false;
      usernameInput.classList.toggle("is-invalid", !username);
      passwordInput.classList.toggle("is-invalid", !password);
      (username ? passwordInput : usernameInput).focus();
      return;
    }

    usernameInput.classList.remove("is-invalid");
    passwordInput.classList.remove("is-invalid");

    if (rememberMe.checked) {
      try {
        localStorage.setItem(REMEMBER_KEY, username);
      } catch {
        /* storage unavailable */
      }
    } else {
      try {
        localStorage.removeItem(REMEMBER_KEY);
      } catch {
        /* storage unavailable */
      }
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in…";
    setTimeout(() => {
      // UI only — no real authentication yet. Redirect to the dashboard.
      window.location.href = "./dashboard.html";
    }, 800);
  });
});
