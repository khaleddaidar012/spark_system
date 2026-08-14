/* ============================================
   Spark ERP — Auth Module
   Single source of truth for the admin account and
   persistent "Remember me" login session.
   The password is never stored in plaintext; only
   its SHA-256 hash is kept and compared at login.
   ============================================ */

export const ADMIN = {
  username: "admin",
  passwordHash: "323015fe2dcfe38cccccb8286f7cd571342488eaab0748d8042ab526410f75fb",
};

const SESSION_KEY = "spark_session";
const REMEMBER_KEY = "spark_remember_session";

export async function verifyAdminPassword(password) {
  if (typeof password !== "string" || !password) return false;
  try {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex === ADMIN.passwordHash;
  } catch {
    return false;
  }
}

/* ---------- Session ---------- */

function storageGet(key, target) {
  try {
    return target.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key, value, target) {
  try {
    target.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function storageRemove(key, target) {
  try {
    target.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

/* Create the login session.
   remember=true  → localStorage: survives closing the browser/app on desktop
                    and phone (that is what the owner wants).
   remember=false → sessionStorage: cleared when the tab/browser closes. */
export function createSession(remember) {
  const now = new Date().toISOString();
  if (remember) {
    storageRemove(SESSION_KEY, window.sessionStorage);
    storageSet(SESSION_KEY, now, window.localStorage);
    storageSet(REMEMBER_KEY, "1", window.localStorage);
  } else {
    storageRemove(SESSION_KEY, window.localStorage);
    storageSet(SESSION_KEY, now, window.sessionStorage);
  }
}

export function getSession() {
  const remembered = storageGet(SESSION_KEY, window.localStorage);
  if (remembered) return { remember: true, at: remembered };
  const session = storageGet(SESSION_KEY, window.sessionStorage);
  if (session) return { remember: false, at: session };
  return null;
}

export function isLoggedIn() {
  return getSession() !== null;
}

export function isRemembered() {
  return storageGet(REMEMBER_KEY, window.localStorage) === "1";
}

export function logout() {
  storageRemove(SESSION_KEY, window.localStorage);
  storageRemove(SESSION_KEY, window.sessionStorage);
  storageRemove(REMEMBER_KEY, window.localStorage);
}

/* Guard a page: if there is no active session, send the user to the login form. */
export function requireAuth() {
  if (!isLoggedIn()) {
    window.location.replace("./login.html");
    return false;
  }
  return true;
}
