/* ============================================
   Spark ERP — i18n Module
   Loads translation JSON, applies to [data-i18n]
   elements and manages lang/dir. English text in
   the markup acts as fallback when JSON is missing.
   ============================================ */

const LANG_KEY = "spark_lang";
const LANGUAGES = ["en", "ar"];

let currentDict = null;

function getStoredLang() {
  try {
    const lang = localStorage.getItem(LANG_KEY);
    return LANGUAGES.includes(lang) ? lang : "en";
  } catch {
    return "en";
  }
}

async function loadTranslations(lang) {
  try {
    const res = await fetch(`../data/i18n/${lang}.json`);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch {
    return null;
  }
}

function resolve(dict, key) {
  return key.split(".").reduce((o, k) => (o ? o[k] : undefined), dict);
}

function applyTranslations(dict) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const text = resolve(dict, el.dataset.i18n);
    if (text != null) el.textContent = text;
  });

  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const text = resolve(dict, el.dataset.i18nPh);
    if (text != null) el.placeholder = text;
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const text = resolve(dict, el.dataset.i18nAria);
    if (text != null) el.setAttribute("aria-label", text);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const text = resolve(dict, el.dataset.i18nTitle);
    if (text != null) el.setAttribute("title", text);
  });
}

function applyDirection(lang) {
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === "ar" ? "rtl" : "ltr";
}

export function getLang() {
  return getStoredLang();
}

export function translate(key) {
  if (!currentDict) return "";
  const text = resolve(currentDict, key);
  return text != null ? text : "";
}

export async function initI18n() {
  const lang = getStoredLang();
  applyDirection(lang);
  const dict = await loadTranslations(lang);
  currentDict = dict;
  if (dict) applyTranslations(dict);
  return lang;
}

export async function setLanguage(lang) {
  if (!LANGUAGES.includes(lang)) return getStoredLang();
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* storage unavailable */
  }
  applyDirection(lang);
  const dict = await loadTranslations(lang);
  currentDict = dict;
  if (dict) applyTranslations(dict);
  return lang;
}

export function toggleLanguage() {
  const next = document.documentElement.lang === "ar" ? "en" : "ar";
  return setLanguage(next);
}
