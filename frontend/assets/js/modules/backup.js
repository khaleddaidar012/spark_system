/* ============================================
   Spark ERP — Backup Module
   Full snapshot export/restore of the shared DB,
   plus automatic twice-daily snapshots pushed to
   the server (stored in Cloudflare KV; fallback:
   local download).
   ============================================ */

import { dbSnapshot } from "./store.js";
import { api, getToken } from "./api.js";

const DB_KEY = "spark_db_v1";
const LAST_BACKUP_KEY = "spark_last_backup";
const BACKUP_INTERVAL_MS = 12 * 60 * 60 * 1000; /* twice daily */
const PREF_KEYS = ["spark_lang", "spark_theme"];

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

export function buildBackupData() {
  const keys = {};
  keys[DB_KEY] = JSON.stringify(dbSnapshot());
  for (const k of PREF_KEYS) {
    const v = safeGet(k);
    if (v != null) keys[k] = v;
  }
  return {
    app: "spark-erp",
    version: 1,
    exportedAt: new Date().toISOString(),
    keys,
  };
}

function fileName() {
  return "spark-backup-" + new Date().toISOString().slice(0, 10) + ".json";
}

export function downloadBackup() {
  const data = buildBackupData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setLastBackupTime(Date.now());
}

export async function restoreBackup(file, onOk, onError) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed || parsed.app !== "spark-erp" || !parsed.keys) {
        onError();
        return;
      }
      for (const [k, v] of Object.entries(parsed.keys)) {
        if (k === DB_KEY) {
          const db = JSON.parse(v);
          if (db && typeof db === "object") await api.restore(db);
        } else {
          try {
            localStorage.setItem(k, v);
          } catch {
            /* storage unavailable */
          }
        }
      }
      onOk();
    } catch {
      onError();
    }
  };
  reader.onerror = () => onError();
  reader.readAsText(file);
}

export function setLastBackupTime(time) {
  safeSet(LAST_BACKUP_KEY, String(time));
}

export function getLastBackupTime() {
  const t = Number(safeGet(LAST_BACKUP_KEY)) || 0;
  return t ? new Date(t).toISOString() : null;
}

export function needsAutoBackup() {
  const t = Number(safeGet(LAST_BACKUP_KEY)) || 0;
  return Date.now() - t >= BACKUP_INTERVAL_MS;
}

/* Push a snapshot to the server so it survives browser data loss.
   Returns true when the server accepted the backup. */
export async function pushBackupToServer(data) {
  try {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;
    const res = await fetch("/api/backup", {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) return false;
    await res.json();
    return true;
  } catch {
    return false;
  }
}

export async function autoBackup() {
  if (!needsAutoBackup()) return false;
  const data = buildBackupData();
  const pushed = await pushBackupToServer(data);
  if (pushed) {
    setLastBackupTime(Date.now());
    return true;
  }
  /* Server unreachable (e.g. app opened without backend) → local file. */
  downloadBackup();
  return true;
}

let backupTimer = null;

function scheduleAutoBackup() {
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => {
    backupTimer = null;
    autoBackup();
  }, 3000);
}

export function initAutoBackup() {
  autoBackup();
  window.addEventListener("spark:data-changed", scheduleAutoBackup);
}