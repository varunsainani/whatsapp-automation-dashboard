const express = require("express");
const auth = require("../middleware/auth");
const authRoutes = require("./auth");
const conversationRoutes = require("./conversations");
const templateRoutes = require("./templates");
const quickReplyRoutes = require("./quickReplies");
const flowRoutes = require("./flows");

const router = express.Router();

router.use("/api/auth", authRoutes);

// All admin resources require a valid JWT.
router.use("/api/conversations", auth, conversationRoutes);
router.use("/api/templates", auth, templateRoutes);
router.use("/api/quick-replies", auth, quickReplyRoutes);
router.use("/api/flows", auth, flowRoutes);

module.exports = router;
