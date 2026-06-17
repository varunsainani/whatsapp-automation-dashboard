const express = require("express");
const {
  list,
  getById,
  updateStatus
} = require("../controllers/conversationController");

const router = express.Router();

router.get("/", list);
router.get("/:id", getById);
router.patch("/:id", updateStatus);

module.exports = router;
