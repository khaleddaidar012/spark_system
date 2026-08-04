/**
 * Placeholder controller (Phase 1).
 * Real business logic will be implemented in later phases.
 */
const appController = {
  healthCheck(req, res) {
    res.status(200).json({ status: 'ok', message: 'Spark ERP API is running' });
  },
};

module.exports = appController;
