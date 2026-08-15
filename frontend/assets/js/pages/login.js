/* ============================================
   Spark ERP — Login Page Script
   Theme, i18n (en/ar), demo admin account.
   ============================================ */

import { initTheme, toggleTheme } from "../modules/theme.js";
import { initI18n, setLanguage, translate } from "../modules/i18n.js";
import { login, isLoggedIn } from "../modules/auth.js";

const REMEMBER_KEY = "spark_remembered_user";

document.addEventListener("DOMContentLoaded", async () => {
  initTheme();

  /* ---------- Language ---------- */
  const langToggle = document.getElementById("langToggle");
  await initI18n();
  langToggle.textContent = document.documentElement.lang === "ar" ? "EN" : "ع";
  langToggle?.addEventListener("click", async () => {
    await setLanguage(document.documentElement.lang === "ar" ? "en" : "ar");
    langToggle.textContent = document.documentElement.lang === "ar" ? "EN" : "ع";
  });

  /* Lucide replaces <i data-lucide> with inline SVGs. */
  window.lucide?.createIcons();

  /* ---------- Theme toggle ---------- */
  document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);

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
  });

  /* ---------- Already signed in? (Remember me) ---------- */
  if (isLoggedIn()) {
    window.location.replace("./dashboard.html");
    return;
  }

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

  /* ---------- Demo login validation ---------- */
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");

  const showError = (key) => {
    errorBox.textContent = translate(key);
    errorBox.hidden = false;
  };

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    usernameInput.classList.remove("is-invalid");
    passwordInput.classList.remove("is-invalid");

    if (!username || !password) {
      showError("login.errorRequired");
      usernameInput.classList.toggle("is-invalid", !username);
      passwordInput.classList.toggle("is-invalid", !password);
      (username ? passwordInput : usernameInput).focus();
      return;
    }

    try {
      await login(username, password, rememberMe.checked);
    } catch {
      showError("login.errorInvalid");
      usernameInput.classList.add("is-invalid");
      passwordInput.classList.add("is-invalid");
      passwordInput.focus();
      return;
    }

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
    loginBtn.textContent = translate("login.signingIn");
    setTimeout(() => {
      window.location.href = "./dashboard.html";
    }, 300);
  });
});
