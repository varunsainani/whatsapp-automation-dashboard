const express = require("express");
const { list, exportCsv } = require("../controllers/contactController");

const router = express.Router();

router.get("/", list);
router.get("/export", exportCsv);

module.exports = router;
