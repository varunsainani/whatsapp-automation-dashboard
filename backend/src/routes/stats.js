const express = require("express");
const { overview } = require("../controllers/statsController");

const router = express.Router();

router.get("/", overview);

module.exports = router;
