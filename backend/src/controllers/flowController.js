const { Op } = require("sequelize");
const { sequelize, Flow } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

const STEP_TYPES = ["say", "ask"];

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function serialize(f) {
  return {
    id: f.id,
    name: f.name,
    steps: f.steps,
    is_active: f.is_active,
    created_at: f.created_at,
    updated_at: f.updated_at
  };
}

// Validates a flow's steps against what the flow engine understands. Returns an
// error message describing the first problem, or null when the steps are valid.
function validateSteps(steps) {
  if (!Array.isArray(steps)) {
    return "steps must be an array";
  }
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    if (!step || typeof step !== "object") {
      return `steps[${i}] must be an object`;
    }
    if (!STEP_TYPES.includes(step.type)) {
      return `steps[${i}].type must be 'say' or 'ask'`;
    }
    if (typeof step.text !== "string" || step.text.trim() === "") {
      return `steps[${i}].text must be a non-empty string`;
    }
    if (step.type === "ask" && (typeof step.key !== "string" || step.key.trim() === "")) {
      return `steps[${i}].key is required for 'ask' steps`;
    }
  }
  return null;
}

// Enforces the single-active-flow invariant the handler relies on: only the
// given flow stays active.
async function deactivateOthers(id, transaction) {
  await Flow.update(
    { is_active: false },
    { where: { id: { [Op.ne]: id } }, transaction }
  );
}

// GET /api/flows
const list = asyncHandler(async (req, res) => {
  const flows = await Flow.findAll({ order: [["id", "ASC"]] });
  return res.json({ success: true, data: flows.map(serialize) });
});

// GET /api/flows/:id
const getById = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid flow id" });
  }
  const flow = await Flow.findByPk(id);
  if (!flow) {
    return res.status(404).json({ success: false, message: "Flow not found" });
  }
  return res.json({ success: true, data: serialize(flow) });
});

// POST /api/flows
const create = asyncHandler(async (req, res) => {
  const { name, steps, is_active } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: "name is required" });
  }
  const stepsError = validateSteps(steps === undefined ? [] : steps);
  if (stepsError) {
    return res.status(400).json({ success: false, message: stepsError });
  }

  const active = is_active !== false; // default to active
  const flow = await sequelize.transaction(async (transaction) => {
    const created = await Flow.create(
      { name, steps: steps || [], is_active: active },
      { transaction }
    );
    if (active) {
      await deactivateOthers(created.id, transaction);
    }
    return created;
  });

  return res.status(201).json({ success: true, data: serialize(flow) });
});

// PUT /api/flows/:id
const update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid flow id" });
  }
  const { name, steps, is_active } = req.body;
  if (steps !== undefined) {
    const stepsError = validateSteps(steps);
    if (stepsError) {
      return res.status(400).json({ success: false, message: stepsError });
    }
  }

  const flow = await sequelize.transaction(async (transaction) => {
    const found = await Flow.findByPk(id, { transaction });
    if (!found) {
      return null;
    }
    if (name !== undefined) found.name = name;
    if (steps !== undefined) found.steps = steps;
    if (is_active !== undefined) found.is_active = is_active;
    found.updated_at = new Date();
    await found.save({ transaction });
    if (found.is_active) {
      await deactivateOthers(found.id, transaction);
    }
    return found;
  });

  if (!flow) {
    return res.status(404).json({ success: false, message: "Flow not found" });
  }
  return res.json({ success: true, data: serialize(flow) });
});

// POST /api/flows/:id/activate
// Marks this flow active and deactivates every other flow.
const activate = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid flow id" });
  }

  const flow = await sequelize.transaction(async (transaction) => {
    const found = await Flow.findByPk(id, { transaction });
    if (!found) {
      return null;
    }
    found.is_active = true;
    found.updated_at = new Date();
    await found.save({ transaction });
    await deactivateOthers(found.id, transaction);
    return found;
  });

  if (!flow) {
    return res.status(404).json({ success: false, message: "Flow not found" });
  }
  return res.json({ success: true, data: serialize(flow) });
});

// DELETE /api/flows/:id
const remove = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid flow id" });
  }
  const deleted = await Flow.destroy({ where: { id } });
  if (!deleted) {
    return res.status(404).json({ success: false, message: "Flow not found" });
  }
  return res.json({ success: true, data: { id } });
});

module.exports = { list, getById, create, update, activate, remove };
