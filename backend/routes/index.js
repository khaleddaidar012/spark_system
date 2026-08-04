const express = require('express');

const router = express.Router();

// Placeholder health route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Spark ERP API is running' });
});

// Future modules (Phase 2+):
// router.use('/auth', require('./authRoutes'));
// router.use('/projects', require('./projectRoutes'));
// router.use('/materials', require('./materialRoutes'));
// router.use('/finance', require('./financeRoutes'));
// router.use('/clients', require('./clientRoutes'));
// router.use('/suppliers', require('./supplierRoutes'));
// router.use('/workers', require('./workerRoutes'));
// router.use('/reports', require('./reportRoutes'));
// router.use('/settings', require('./settingRoutes'));

module.exports = router;
