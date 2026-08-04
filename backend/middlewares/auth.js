/**
 * Placeholder auth middleware (Phase 1).
 * JWT verification will be implemented in a later phase.
 */
function requireAuth(req, res, next) {
  // TODO (Phase 2): verify Bearer JWT token
  return next();
}

function requireAdmin(req, res, next) {
  // TODO (Phase 2): check user role is admin
  return next();
}

module.exports = { requireAuth, requireAdmin };
