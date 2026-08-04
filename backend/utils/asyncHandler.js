/**
 * Wraps async route handlers so thrown errors
 * are forwarded to the error handler automatically.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
