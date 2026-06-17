const asyncHandler = require("../utils/asyncHandler");

// GET /api/whatsapp/status
// Reports whether the WhatsApp transport is connected (and whether a QR is
// pending). Returns disconnected when the client is disabled/unavailable.
const status = asyncHandler(async (req, res) => {
  const whatsapp = req.app.get("whatsapp");
  if (!whatsapp || typeof whatsapp.getStatus !== "function") {
    return res.json({
      success: true,
      data: { enabled: false, connected: false, hasQR: false }
    });
  }
  const current = whatsapp.getStatus();
  return res.json({
    success: true,
    data: {
      enabled: process.env.WHATSAPP_ENABLED !== "false",
      connected: current.connected,
      hasQR: current.hasQR
    }
  });
});

module.exports = { status };
