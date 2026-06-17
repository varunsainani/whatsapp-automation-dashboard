const { QuickReply } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function serialize(q) {
  return {
    id: q.id,
    label: q.label,
    response_text: q.response_text,
    created_at: q.created_at
  };
}

// GET /api/quick-replies
const list = asyncHandler(async (req, res) => {
  const replies = await QuickReply.findAll({ order: [["id", "ASC"]] });
  return res.json({ success: true, data: replies.map(serialize) });
});

// GET /api/quick-replies/:id
const getById = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid quick reply id" });
  }
  const reply = await QuickReply.findByPk(id);
  if (!reply) {
    return res.status(404).json({ success: false, message: "Quick reply not found" });
  }
  return res.json({ success: true, data: serialize(reply) });
});

// POST /api/quick-replies
const create = asyncHandler(async (req, res) => {
  const { label, response_text } = req.body;
  if (!label || !response_text) {
    return res
      .status(400)
      .json({ success: false, message: "label and response_text are required" });
  }
  const reply = await QuickReply.create({ label, response_text });
  return res.status(201).json({ success: true, data: serialize(reply) });
});

// PUT /api/quick-replies/:id
const update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid quick reply id" });
  }
  const reply = await QuickReply.findByPk(id);
  if (!reply) {
    return res.status(404).json({ success: false, message: "Quick reply not found" });
  }

  const { label, response_text } = req.body;
  if (label === undefined && response_text === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Provide label and/or response_text to update" });
  }
  if (label !== undefined) reply.label = label;
  if (response_text !== undefined) reply.response_text = response_text;
  await reply.save();

  return res.json({ success: true, data: serialize(reply) });
});

// DELETE /api/quick-replies/:id
const remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid quick reply id" });
  }
  const deleted = await QuickReply.destroy({ where: { id } });
  if (!deleted) {
    return res.status(404).json({ success: false, message: "Quick reply not found" });
  }
  return res.json({ success: true, data: { id } });
});

module.exports = { list, getById, create, update, remove };
