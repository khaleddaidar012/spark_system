/* ============================================
   Spark ERP — Auth Module
   Single source of truth for the admin account and
   persistent "Remember me" login session.
   ============================================ */

export const ADMIN = { username: "admin", password: "Spark@2026#ERP" };

const SESSION_KEY = "spark_session";
const REMEMBER_KEY = "spark_remember_session";

export function verifyAdminPassword(password) {
  return typeof password === "string" && password === ADMIN.password;
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
