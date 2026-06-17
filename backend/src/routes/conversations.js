const express = require("express");
const {
  list,
  getById,
  update,
  reply
} = require("../controllers/conversationController");

const router = express.Router();

router.get("/", list);
router.get("/:id", getById);
router.patch("/:id", update);
router.post("/:id/reply", reply);

module.exports = router;
