/* ============================================
   Spark ERP — API Client Module
   Thin fetch wrapper for the Cloudflare Pages
   Functions API. Handles auth headers, token
   storage, JSON parsing and 401 redirects.
   ============================================ */

export const API_BASE = "/api";
const TOKEN_KEY = "spark_token";
const REMEMBER_KEY = "spark_remember";

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setToken(token, remember) {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REMEMBER_KEY, "1");
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(REMEMBER_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
  }

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("network-error");
  }

  if (res.status === 401) {
    clearToken();
    if (auth) window.location.replace("./login.html");
    throw new Error("unauthorized");
  }
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || "http-" + res.status);
  }
  return data;
}

export const api = {
  request,
  /* auth */
  login: (username, password) => request("/auth/login", { method: "POST", auth: false, body: { username, password } }),
  verifyPassword: (password) => request("/auth/verify", { method: "POST", body: { password } }),
  changePassword: (currentPassword, newPassword) => request("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } }),
  logout: () => request("/auth/logout", { method: "POST", auth: false }),

  /* data */
  snapshot: () => request("/data"),
  save: (collection, item) => request("/data", { method: "POST", body: { collection, item } }),
  remove: (collection, id) => request("/data", { method: "DELETE", body: { collection, id } }),
  reset: () => request("/data/reset", { method: "POST" }),
  seed: () => request("/data/seed", { method: "POST" }),
  restore: (db) => request("/data/restore", { method: "POST", body: { db } }),

  /* sync */
  pushSync: (payload) => request("/sync/push", { method: "POST", body: payload }),
  pullSync: () => request("/sync/pull"),

  /* backup */
  backup: (payload) => request("/backup", { method: "POST", body: payload }),
  backupLatest: () => request("/backup/latest"),

  /* health */
  health: () => request("/health", { auth: false }),
};
