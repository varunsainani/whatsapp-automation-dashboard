// Centralized error responder. Any error forwarded via next(err) lands here and
// is returned as a consistent JSON shape so clients never see a raw stack trace.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error("Unhandled request error:", err);
  if (res.headersSent) {
    return next(err);
  }
  return res
    .status(500)
    .json({ success: false, message: "Internal server error" });
};

module.exports = errorHandler;
