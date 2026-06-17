// Wraps an async route handler so any thrown/rejected error is forwarded to
// Express' error middleware instead of crashing the process. Keeps the
// controllers free of repetitive try/catch boilerplate.
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = asyncHandler;
