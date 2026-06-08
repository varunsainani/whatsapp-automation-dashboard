const express = require("express");
const authRoutes = require("./auth");

const router = express.Router();

router.use("/api/auth", authRoutes);

module.exports = router;
