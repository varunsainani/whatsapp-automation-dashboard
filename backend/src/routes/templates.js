const express = require("express");
const {
  list,
  getById,
  create,
  update,
  remove
} = require("../controllers/templateController");

const router = express.Router();

router.get("/", list);
router.post("/", create);
router.get("/:id", getById);
router.put("/:id", update);
router.delete("/:id", remove);

module.exports = router;
