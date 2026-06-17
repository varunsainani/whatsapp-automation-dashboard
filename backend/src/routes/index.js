const express = require("express");
const auth = require("../middleware/auth");
const authRoutes = require("./auth");
const conversationRoutes = require("./conversations");
const templateRoutes = require("./templates");
const quickReplyRoutes = require("./quickReplies");
const flowRoutes = require("./flows");
const statsRoutes = require("./stats");
const contactRoutes = require("./contacts");
const whatsappRoutes = require("./whatsapp");

const router = express.Router();

router.use("/api/auth", authRoutes);

// All admin resources require a valid JWT.
router.use("/api/stats", auth, statsRoutes);
router.use("/api/conversations", auth, conversationRoutes);
router.use("/api/contacts", auth, contactRoutes);
router.use("/api/templates", auth, templateRoutes);
router.use("/api/quick-replies", auth, quickReplyRoutes);
router.use("/api/flows", auth, flowRoutes);
router.use("/api/whatsapp", auth, whatsappRoutes);

module.exports = router;
