const express = require("express");
const { status } = require("../controllers/whatsappController");

const router = express.Router();

router.get("/status", status);

module.exports = router;
