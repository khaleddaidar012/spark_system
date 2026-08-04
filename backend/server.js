const path = require('path');
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
