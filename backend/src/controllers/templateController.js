const { Template } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function serialize(t) {
  return {
    id: t.id,
    name: t.name,
    body: t.body,
    created_at: t.created_at,
    updated_at: t.updated_at
  };
}

// GET /api/templates
const list = asyncHandler(async (req, res) => {
  const templates = await Template.findAll({ order: [["id", "ASC"]] });
  return res.json({ success: true, data: templates.map(serialize) });
});

// GET /api/templates/:id
const getById = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid template id" });
  }
  const template = await Template.findByPk(id);
  if (!template) {
    return res.status(404).json({ success: false, message: "Template not found" });
  }
  return res.json({ success: true, data: serialize(template) });
});

// POST /api/templates
const create = asyncHandler(async (req, res) => {
  const { name, body } = req.body;
  if (!name || !body) {
    return res
      .status(400)
      .json({ success: false, message: "name and body are required" });
  }
  const template = await Template.create({ name, body });
  return res.status(201).json({ success: true, data: serialize(template) });
});

// PUT /api/templates/:id
const update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid template id" });
  }
  const template = await Template.findByPk(id);
  if (!template) {
    return res.status(404).json({ success: false, message: "Template not found" });
  }

  const { name, body } = req.body;
  if (name === undefined && body === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Provide name and/or body to update" });
  }
  if (name !== undefined) template.name = name;
  if (body !== undefined) template.body = body;
  template.updated_at = new Date();
  await template.save();

  return res.json({ success: true, data: serialize(template) });
});

// DELETE /api/templates/:id
const remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid template id" });
  }
  const deleted = await Template.destroy({ where: { id } });
  if (!deleted) {
    return res.status(404).json({ success: false, message: "Template not found" });
  }
  return res.json({ success: true, data: { id } });
});

module.exports = { list, getById, create, update, remove };
