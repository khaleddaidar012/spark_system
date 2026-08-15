/* ============================================
   Spark ERP — Daily local backup tool
   Pulls a full snapshot from the live API and
   stores it on this machine, organized by date:
     backups/YYYY-MM-DD/spark-backup-<ts>.json
   Keeps a log (backup.log) and a machine
   readable status file (status.json) with the
   last successful backup, next scheduled run,
   storage location and any errors.

   Usage:
     node scripts/backup.mjs                 # run a backup now
     node scripts/backup.mjs --check         # print status
     node scripts/backup.mjs --json          # print status as JSON
     node scripts/backup.mjs --restore <file> # restore a backup file

   Config (env vars, or a backup.env next to this file):
     SPARK_API_URL          base URL of the live app (default https://spark-system.pages.dev)
     SPARK_ADMIN_USERNAME   admin username (default admin)
     SPARK_ADMIN_PASSWORD   the admin password
     BACKUP_DIR             where backups are stored (default ./backups)
     BACKUP_RETENTION_DAYS  delete folders older than this (default 30)
     BACKUP_TIME            HH:MM the daily task runs, only used for status (default 03:00)

   Failures never crash anything: they are logged and reported with a
   non-zero exit code, and the next scheduled run retries automatically.
   ============================================ */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_URL = "https://spark-system.pages.dev";

function loadConfig() {
  const env = { ...process.env };
  const envFile = join(ROOT, "backup.env");
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  const url = (env.SPARK_API_URL || DEFAULT_URL).replace(/\/+$/, "");
  return {
    apiUrl: url,
    username: env.SPARK_ADMIN_USERNAME || "admin",
    password: env.SPARK_ADMIN_PASSWORD || "",
    backupDir: env.BACKUP_DIR ? resolve(ROOT, env.BACKUP_DIR) : join(ROOT, "backups"),
    retentionDays: Number(env.BACKUP_RETENTION_DAYS) || 30,
    backupTime: env.BACKUP_TIME || "03:00",
  };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function logLine(msg) {
  return "[" + new Date().toISOString() + "] " + msg;
}

function appendLog(file, msg) {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, logLine(msg) + "\n", { flag: "a" });
  } catch {
    /* logging must never take the backup down */
  }
}

function writeStatus(file, status) {
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(status, null, 2));
  } catch {
    /* best effort */
  }
}

function nextRunAt(timeStr) {
  const [h, m] = (timeStr || "03:00").split(":").map(Number);
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 3, m || 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.toISOString();
}

function countsOf(db) {
  const out = {};
  for (const [k, v] of Object.entries(db || {})) {
    if (Array.isArray(v)) out[k] = v.length;
  }
  return out;
}

async function apiFetch(url, options) {
  const headers = new Headers(options.headers || {});
  headers.set("Connection", "close");
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function login(cfg) {
  if (!cfg.password) {
    const err = new Error("SPARK_ADMIN_PASSWORD is not set (put it in backup.env)");
    err.code = "NO_PASSWORD";
    throw err;
  }
  const { status, data } = await apiFetch(cfg.apiUrl + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: cfg.username, password: cfg.password }),
  });
  if (status !== 200 || !data || !data.token) {
    throw new Error("login failed (HTTP " + status + "): " + JSON.stringify(data));
  }
  return data.token;
}

async function fetchSnapshot(cfg, token) {
  const { status, data } = await apiFetch(cfg.apiUrl + "/api/data", {
    headers: { Authorization: "Bearer " + token },
  });
  if (status !== 200 || !data) {
    throw new Error("snapshot failed (HTTP " + status + "): " + JSON.stringify(data));
  }
  return data;
}

function buildBackupData(db) {
  return {
    app: "spark-erp",
    version: 1,
    exportedAt: new Date().toISOString(),
    keys: { spark_db_v1: JSON.stringify(db) },
  };
}

function parseBackupFile(file) {
  const raw = readFileSync(file, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || parsed.app !== "spark-erp" || !parsed.keys) {
    throw new Error("not a Spark ERP backup file: " + file);
  }
  const dbRaw = parsed.keys.spark_db_v1;
  if (!dbRaw) throw new Error("backup file has no database payload: " + file);
  const db = JSON.parse(dbRaw);
  if (!db || typeof db !== "object") throw new Error("invalid database payload in: " + file);
  return db;
}

async function doBackup(cfg) {
  const token = await login(cfg);
  const db = await fetchSnapshot(cfg, token);

  const now = new Date();
  const day = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  const stamp =
    day + "-" + pad(now.getHours()) + "-" + pad(now.getMinutes()) + "-" + pad(now.getSeconds());
  const dayDir = join(cfg.backupDir, day);
  const file = join(dayDir, "spark-backup-" + stamp + ".json");

  mkdirSync(dayDir, { recursive: true });
  writeFileSync(file, JSON.stringify(buildBackupData(db), null, 2));

  const counts = countsOf(db);
  const status = {
    lastRun: now.toISOString(),
    lastSuccess: now.toISOString(),
    lastFile: file,
    counts,
    nextRun: nextRunAt(cfg.backupTime),
    backupsDir: cfg.backupDir,
    error: null,
  };
  writeStatus(join(cfg.backupDir, "status.json"), status);
  appendLog(join(cfg.backupDir, "backup.log"), "OK file=" + file + " counts=" + JSON.stringify(counts));
  console.log("Backup written: " + file);
  console.log("Collections: " + JSON.stringify(counts));
  return { file, counts };
}

function pruneOld(cfg) {
  if (!existsSync(cfg.backupDir)) return;
  const now = Date.now();
  const keep = cfg.retentionDays * 24 * 60 * 60 * 1000;
  for (const entry of readdirSync(cfg.backupDir)) {
    const full = join(cfg.backupDir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry)) continue;
    if (now - statSync(full).mtimeMs > keep) {
      try {
        rmSync(full, { recursive: true, force: true });
        appendLog(join(cfg.backupDir, "backup.log"), "PRUNED " + entry);
      } catch (e) {
        appendLog(join(cfg.backupDir, "backup.log"), "ERROR pruning " + entry + ": " + e.message);
      }
    }
  }
}

async function doRestore(cfg, file) {
  const db = parseBackupFile(file);
  const token = await login(cfg);
  const { status, data } = await apiFetch(cfg.apiUrl + "/api/data/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ db }),
  });
  if (status !== 200 || !data || !data.ok) {
    throw new Error("restore failed (HTTP " + status + "): " + JSON.stringify(data));
  }
  const now = new Date().toISOString();
  appendLog(join(cfg.backupDir, "backup.log"), "RESTORE OK file=" + file);
  console.log("Restored from: " + file);
  return { ok: true, restoredAt: now };
}

function readStatus(cfg) {
  const file = join(cfg.backupDir, "status.json");
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function printStatus(cfg, asJson) {
  const s = readStatus(cfg);
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          backupsDir: cfg.backupDir,
          lastRun: s ? s.lastRun : null,
          lastSuccess: s ? s.lastSuccess : null,
          lastFile: s ? s.lastFile : null,
          nextRun: s ? s.nextRun : nextRunAt(cfg.backupTime),
          error: s ? s.error : null,
        },
        null,
        2
      )
    );
    return;
  }
  if (!s) {
    console.log("No backup has been created yet.");
    console.log("Run: node scripts/backup.mjs");
    return;
  }
  console.log("Backups directory : " + s.backupsDir);
  console.log("Last run          : " + (s.lastRun || "never"));
  console.log("Last success      : " + (s.lastSuccess || "never"));
  console.log("Last backup file  : " + (s.lastFile || "—"));
  console.log("Next scheduled    : " + (s.nextRun || "—"));
  console.log("Last error        : " + (s.error || "none"));
}

/* ------------------------------------------------------------------ */
const args = process.argv.slice(2);
const cfg = loadConfig();
const isRestore = args.includes("--restore");
const restoreFile = isRestore ? args[args.indexOf("--restore") + 1] : null;

async function main() {
  mkdirSync(cfg.backupDir, { recursive: true });
  if (isRestore) {
    if (!restoreFile) throw new Error("--restore requires a backup file path");
    return await doRestore(cfg, restoreFile);
  }
  if (args.includes("--check") || args.includes("--json")) {
    printStatus(cfg, args.includes("--json"));
    return;
  }
  const res = await doBackup(cfg);
  pruneOld(cfg);
  return res;
}

main()
  .then(() => {
    /* Let Node drain and exit cleanly (exit code 0). Calling process.exit(0)
       here can race undici's keep-alive socket teardown on Windows. */
  })
  .catch((err) => {
    const msg = err && err.message ? err.message : String(err);
    const statusFile = join(cfg.backupDir, "status.json");
    const now = new Date().toISOString();
    const prev = readStatus(cfg) || {};
    writeStatus(statusFile, {
      lastRun: now,
      lastSuccess: prev.lastSuccess || null,
      lastFile: prev.lastFile || null,
      nextRun: nextRunAt(cfg.backupTime),
      backupsDir: cfg.backupDir,
      error: msg,
    });
    appendLog(join(cfg.backupDir, "backup.log"), "ERROR " + msg);
    console.error("Backup failed: " + msg);
    process.exit(1);
  });