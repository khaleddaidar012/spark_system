const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const appRoutes = require('./routes');
const { connectDB } = require('./config/db');

const app = express();

// Middlewares (allow large payloads for backup JSON with image attachments)
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Static frontend (Phase 1: no API yet)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// API routes (placeholder — wired in later phases)
app.use('/api', appRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Spark ERP API is running' });
});

/* ---------- Automatic backups ----------
   The browser pushes a full snapshot twice a day.
   Each snapshot is stored with a timestamp and the
   newest is also kept as latest.json. */
const os = require('os');

function getDownloadsBackupDir() {
  try {
    const homeDownloads = path.join(os.homedir(), 'Downloads');
    return homeDownloads;
  } catch {
    return 'C:\\Downloads';
  }
}

const BACKUP_DIR = getDownloadsBackupDir();

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

app.post('/api/backup', (req, res) => {
  try {
    const data = req.body;
    if (!data || data.app !== 'spark-erp' || !data.keys) {
      return res.status(400).json({ status: 'error', message: 'Invalid backup payload' });
    }
    ensureBackupDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `spark-backup-${stamp}.json`;
    const fullPath = path.join(BACKUP_DIR, fileName);
    const payload = JSON.stringify(data, null, 2);
    fs.writeFileSync(fullPath, payload);
    fs.writeFileSync(path.join(BACKUP_DIR, 'latest.json'), payload);
    res.status(200).json({
      status: 'ok',
      message: 'Backup stored',
      path: fullPath,
      directory: BACKUP_DIR,
      fileName
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('/api/backup/latest', (req, res) => {
  const file = path.join(BACKUP_DIR, 'latest.json');
  if (!fs.existsSync(file)) {
    return res.status(404).json({ status: 'error', message: 'No backup yet' });
  }
  res.type('application/json').send(fs.readFileSync(file));
});

/* ---------- Auth routes ----------
   Simple hardcoded credentials for Phase 1.
   Replace with a real DB check in Phase 2.       */
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Spark@2026#ERP';
const AUTH_TOKEN = 'spark-static-token-phase1';   // static token — fine for local use

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  if (cleanUser === ADMIN_USER.toLowerCase() && (cleanPass === ADMIN_PASS || password === ADMIN_PASS)) {
    return res.status(200).json({ token: AUTH_TOKEN, username: ADMIN_USER });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/auth/verify', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASS) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ error: 'Wrong password' });
});

app.post('/api/auth/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Invalid password' });
  }
  if (currentPassword === ADMIN_PASS || currentPassword.trim() === ADMIN_PASS) {
    ADMIN_PASS = newPassword;
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ error: 'Wrong password' });
});

app.post('/api/auth/logout', (_req, res) => {
  res.status(204).end();
});

/* ---------- Data routes (in-memory / localStorage-first) ----------
   The frontend manages its own state. These endpoints are thin stubs
   that let the API calls resolve without 404 errors.                 */
const DB_DIR = path.join(__dirname, 'backups');
const DB_FILE = path.join(DB_DIR, 'db.json');

function readDB() {
  try {
    if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch { /* ignore */ }
  return { projects: [], contractors: [], suppliers: [], transactions: [], materials: [] };
}

function writeDB(data) {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function authGuard(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token !== AUTH_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/api/data', authGuard, (_req, res) => {
  res.json(readDB());
});

app.post('/api/data', authGuard, (req, res) => {
  const { collection, item } = req.body || {};
  if (!collection || !item) return res.status(400).json({ error: 'Missing collection or item' });
  const db = readDB();
  if (!db[collection]) db[collection] = [];
  const idx = db[collection].findIndex(r => r.id === item.id);
  if (idx >= 0) db[collection][idx] = item;
  else db[collection].push(item);
  writeDB(db);
  res.status(200).json({ ok: true });
});

app.delete('/api/data', authGuard, (req, res) => {
  const { collection, id } = req.body || {};
  if (!collection || !id) return res.status(400).json({ error: 'Missing collection or id' });
  const db = readDB();
  if (db[collection]) db[collection] = db[collection].filter(r => r.id !== id);
  writeDB(db);
  res.status(200).json({ ok: true });
});

app.post('/api/data/reset', authGuard, (_req, res) => {
  writeDB({ projects: [], contractors: [], suppliers: [], transactions: [], materials: [] });
  res.status(200).json({ ok: true });
});

app.post('/api/data/seed', authGuard, (_req, res) => {
  res.status(200).json({ ok: true, message: 'Seed not implemented in Phase 1' });
});

app.post('/api/data/restore', authGuard, (req, res) => {
  const { db } = req.body || {};
  if (!db) return res.status(400).json({ error: 'Missing db payload' });
  writeDB(db);
  res.status(200).json({ ok: true });
});

/* Sync routes */
app.post('/api/sync/push', authGuard, (req, res) => {
  const ops = Array.isArray(req.body && req.body.operations) ? req.body.operations : [];
  const processed = [];
  const db = readDB();

  for (const op of ops) {
    if (!op || !op.entity || !op.payload) continue;
    const coll = op.entity;
    if (!db[coll]) db[coll] = [];

    if (op.operation === 'delete') {
      const targetId = op.entityId || op.payload.id;
      db[coll] = db[coll].filter(r => r.id !== targetId);
    } else {
      const idx = db[coll].findIndex(r => r.id === op.payload.id);
      if (idx >= 0) db[coll][idx] = op.payload;
      else db[coll].push(op.payload);
    }
    if (op.id) processed.push(op.id);
  }

  writeDB(db);
  res.status(200).json({ ok: true, processed, serverTime: Date.now() });
});

app.get('/api/sync/pull', authGuard, (_req, res) => {
  res.status(200).json({ ok: true, serverTime: Date.now(), data: readDB() });
});

// Not found handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Spark ERP server running on http://localhost:${PORT}`);
  // MongoDB connection is a placeholder for Phase 1.
  // Uncomment in a later phase once the database is configured.
  // connectDB();
});
