const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const appRoutes = require('./routes');
const { connectDB } = require('./config/db');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
const BACKUP_DIR = path.join(__dirname, 'backups');

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
    const payload = JSON.stringify(data, null, 2);
    fs.writeFileSync(path.join(BACKUP_DIR, `spark-backup-${stamp}.json`), payload);
    fs.writeFileSync(path.join(BACKUP_DIR, 'latest.json'), payload);
    res.status(200).json({ status: 'ok', message: 'Backup stored' });
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
