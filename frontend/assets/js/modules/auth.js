/* ============================================
   Spark ERP — Auth Module
   Server-verified login. The browser sends the
   username/password to /api/auth/login and keeps
   the returned bearer token. No password or hash
   is ever stored in the frontend code.
   ============================================ */

import { api, getToken, setToken, clearToken } from "./api.js";

/* Returns the logged-in username after a successful login. */
export async function login(username, password, remember) {
  const res = await api.login(username, password);
  setToken(res.token, remember);
  return res.username;
}

export function isLoggedIn() {
  return getToken() !== null;
}

/* Guard a page: if there is no session token, send the user to the login form. */
export function requireAuth() {
  if (!isLoggedIn()) {
    window.location.replace("./login.html");
    return false;
  }
  return true;
}

export async function logout() {
  try {
    await api.logout();
  } catch {
    /* token may already be invalid — ignore */
  }
  clearToken();
}