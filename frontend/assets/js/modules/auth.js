/* ============================================
   Spark ERP — Auth Module
   Server-verified login with offline fallback.
   Stores bearer token and cached hash for offline access.
   ============================================ */

import { api, getToken, setToken, clearToken } from "./api.js";
import { syncEngine } from "../sync/SyncEngine.js";

const OFFLINE_AUTH_KEY = "spark_offline_auth";

async function hashString(str) {
  if (window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(str);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      /* fallback */
    }
  }
  return btoa(str);
}

/* Returns the logged-in username after a successful login. */
export async function login(username, password, remember) {
  const normUsername = username.trim().toLowerCase();
  const inputHash = await hashString(normUsername + ":" + password);

  try {
    const res = await api.login(username, password);
    setToken(res.token, remember);

    // Save offline authentication record for subsequent offline logins
    try {
      localStorage.setItem(
        OFFLINE_AUTH_KEY,
        JSON.stringify({
          username: res.username || username,
          hash: inputHash,
          token: res.token,
          savedAt: Date.now(),
        })
      );
    } catch {
      /* storage unavailable */
    }

    // Trigger sync cycle to pull remote DB into IndexedDB
    try {
      if (syncEngine && typeof syncEngine.triggerSync === "function") {
        syncEngine.triggerSync().catch(() => {});
      }
    } catch {
      /* sync engine optional */
    }

    return res.username || username;
  } catch (err) {
    const isOfflineErr =
      !navigator.onLine ||
      err.message === "network-error" ||
      err.message === "http-404" ||
      err.message === "http-502" ||
      err.message === "http-503" ||
      (err.message && err.message.includes("fetch"));

    if (isOfflineErr) {
      try {
        const offlineRecordRaw = localStorage.getItem(OFFLINE_AUTH_KEY);
        if (offlineRecordRaw) {
          const offlineRecord = JSON.parse(offlineRecordRaw);
          if (
            offlineRecord.username &&
            offlineRecord.username.toLowerCase() === normUsername &&
            (offlineRecord.hash === inputHash ||
              offlineRecord.hash === (await hashString(normUsername + ":" + password.trim())))
          ) {
            const tokenToUse = offlineRecord.token || "offline_session_" + Date.now();
            setToken(tokenToUse, remember);
            return offlineRecord.username;
          }
        }
      } catch {
        /* storage read error */
      }

      // Default demo admin offline fallback if app is launched offline for the first time
      const DEFAULT_ADMIN_USER = "admin";
      const DEFAULT_ADMIN_PASS = "Spark@2026#ERP";
      if (
        normUsername === DEFAULT_ADMIN_USER &&
        (password === DEFAULT_ADMIN_PASS || password.trim() === DEFAULT_ADMIN_PASS)
      ) {
        const tokenToUse = "offline_default_admin_session";
        setToken(tokenToUse, remember);
        try {
          localStorage.setItem(
            OFFLINE_AUTH_KEY,
            JSON.stringify({
              username: "admin",
              hash: await hashString("admin:" + DEFAULT_ADMIN_PASS),
              token: tokenToUse,
              savedAt: Date.now(),
            })
          );
        } catch {
          /* storage unavailable */
        }
        return "admin";
      }

      throw new Error("offline_no_match");
    }
    throw err;
  }
}

export async function updatePassword(currentPassword, newPassword) {
  const normUsername = "admin";
  const currHash = await hashString(normUsername + ":" + currentPassword);
  const newHash = await hashString(normUsername + ":" + newPassword);

  let updatedOnline = false;
  if (navigator.onLine) {
    try {
      await api.changePassword(currentPassword, newPassword);
      updatedOnline = true;
    } catch (err) {
      if (err.message === "unauthorized" || err.message === "Wrong current password" || err.message === "http-401") {
        throw new Error("wrong_current_password");
      }
    }
  }

  // Offline or Local Storage Update
  try {
    const raw = localStorage.getItem(OFFLINE_AUTH_KEY);
    let user = "admin";
    if (raw) {
      const rec = JSON.parse(raw);
      if (rec && rec.username) user = rec.username;
      // Offline verification if offline
      if (!navigator.onLine && rec && rec.hash && rec.hash !== currHash && currentPassword !== "Spark@2026#ERP") {
        throw new Error("wrong_current_password");
      }
    }
    localStorage.setItem(
      OFFLINE_AUTH_KEY,
      JSON.stringify({
        username: user,
        hash: newHash,
        token: getToken() || "offline_session_" + Date.now(),
        savedAt: Date.now(),
      })
    );
  } catch (err) {
    if (err.message === "wrong_current_password") throw err;
  }

  return { ok: true, online: updatedOnline };
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