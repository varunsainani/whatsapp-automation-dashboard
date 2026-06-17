const express = require("express");
const {
  list,
  getById,
  create,
  update,
  activate,
  remove
} = require("../controllers/flowController");

const router = express.Router();

router.get("/", list);
router.post("/", create);
router.get("/:id", getById);
router.put("/:id", update);
router.post("/:id/activate", activate);
router.delete("/:id", remove);

module.exports = router;
