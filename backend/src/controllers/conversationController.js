const { fn, col, Op } = require("sequelize");
const { Conversation, Contact, Message } = require("../models");
const { serializeMessage } = require("../whatsapp/handler");
const asyncHandler = require("../utils/asyncHandler");

const VALID_STATUSES = ["active", "closed"];

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function emit(req, event, payload) {
  const io = req.app.get("io");
  if (io && typeof io.emit === "function") io.emit(event, payload);
}

// GET /api/conversations?q=&status=&page=&limit=
// Lists conversations newest-first with contact, latest-message preview and a
// message count. Supports search (contact name/phone), status filter and
// pagination. Aggregates are gathered in a fixed number of queries.
const list = asyncHandler(async (req, res) => {
  const { q, status } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));

  const where = {};
  if (VALID_STATUSES.includes(status)) where.status = status;

  const contactInclude = { model: Contact };
  if (q && q.trim()) {
    contactInclude.where = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${q.trim()}%` } },
        { phone_number: { [Op.iLike]: `%${q.trim()}%` } }
      ]
    };
    contactInclude.required = true;
  }

  const { rows: conversations, count: total } =
    await Conversation.findAndCountAll({
      where,
      include: [contactInclude],
      order: [["updated_at", "DESC"]],
      limit,
      offset: (page - 1) * limit
    });

  const ids = conversations.map((c) => c.id);
  const counts = {};
  const lastMessages = {};

  if (ids.length > 0) {
    const grouped = await Message.findAll({
      attributes: [
        "conversation_id",
        [fn("COUNT", col("id")), "count"],
        [fn("MAX", col("id")), "last_id"]
      ],
      where: { conversation_id: ids },
      group: ["conversation_id"],
      raw: true
    });

    const lastIds = [];
    for (const row of grouped) {
      counts[row.conversation_id] = Number(row.count);
      lastIds.push(row.last_id);
    }

    if (lastIds.length > 0) {
      const messages = await Message.findAll({ where: { id: lastIds } });
      for (const message of messages) {
        lastMessages[message.conversation_id] = message;
      }
    }
  }

  const data = conversations.map((conversation) => {
    const last = lastMessages[conversation.id];
    const contact = conversation.Contact;
    return {
      id: conversation.id,
      status: conversation.status,
      bot_enabled: conversation.bot_enabled,
      current_step: conversation.current_step,
      collected: conversation.collected,
      started_at: conversation.started_at,
      updated_at: conversation.updated_at,
      contact: contact
        ? { id: contact.id, phone_number: contact.phone_number, name: contact.name }
        : null,
      message_count: counts[conversation.id] || 0,
      last_message: last
        ? { direction: last.direction, body: last.body, timestamp: last.timestamp }
        : null
    };
  });

  return res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

// GET /api/conversations/:id
const getById = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid conversation id" });
  }

  const conversation = await Conversation.findByPk(id, {
    include: [{ model: Contact }]
  });
  if (!conversation) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }

  const messages = await Message.findAll({
    where: { conversation_id: id },
    order: [["timestamp", "ASC"], ["id", "ASC"]]
  });

  const contact = conversation.Contact;
  return res.json({
    success: true,
    data: {
      id: conversation.id,
      status: conversation.status,
      bot_enabled: conversation.bot_enabled,
      current_step: conversation.current_step,
      collected: conversation.collected,
      started_at: conversation.started_at,
      updated_at: conversation.updated_at,
      contact: contact
        ? { id: contact.id, phone_number: contact.phone_number, name: contact.name }
        : null,
      messages: messages.map((m) => ({
        id: m.id,
        direction: m.direction,
        body: m.body,
        timestamp: m.timestamp
      }))
    }
  });
});

// PATCH /api/conversations/:id  { status?, bot_enabled? }
// Updates the conversation status and/or toggles the bot (human takeover).
const update = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid conversation id" });
  }

  const { status, bot_enabled } = req.body;
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ success: false, message: "status must be 'active' or 'closed'" });
  }
  if (bot_enabled !== undefined && typeof bot_enabled !== "boolean") {
    return res
      .status(400)
      .json({ success: false, message: "bot_enabled must be a boolean" });
  }
  if (status === undefined && bot_enabled === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Provide status and/or bot_enabled" });
  }

  const conversation = await Conversation.findByPk(id);
  if (!conversation) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }

  if (status !== undefined) conversation.status = status;
  if (bot_enabled !== undefined) conversation.bot_enabled = bot_enabled;
  conversation.updated_at = new Date();
  await conversation.save();

  emit(req, "conversation:update", {
    id: conversation.id,
    status: conversation.status,
    bot_enabled: conversation.bot_enabled,
    current_step: conversation.current_step,
    collected: conversation.collected
  });

  return res.json({
    success: true,
    data: {
      id: conversation.id,
      status: conversation.status,
      bot_enabled: conversation.bot_enabled
    }
  });
});

// POST /api/conversations/:id/reply  { body }
// Sends a manual agent message into the conversation. The message is always
// persisted and broadcast; `delivered` reflects whether WhatsApp was connected.
const reply = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid conversation id" });
  }
  const { body } = req.body;
  if (!body || !String(body).trim()) {
    return res.status(400).json({ success: false, message: "body is required" });
  }

  const conversation = await Conversation.findByPk(id, {
    include: [{ model: Contact }]
  });
  if (!conversation) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }
  const contact = conversation.Contact;

  const message = await Message.create({
    conversation_id: conversation.id,
    direction: "outbound",
    body: String(body).trim()
  });

  conversation.updated_at = new Date();
  await conversation.save();

  emit(req, "message:new", serializeMessage(message, contact));

  // Attempt delivery over WhatsApp; degrade gracefully if not connected.
  let delivered = false;
  const whatsapp = req.app.get("whatsapp");
  if (whatsapp && typeof whatsapp.sendText === "function" && contact) {
    try {
      await whatsapp.sendText(contact.phone_number, message.body);
      delivered = true;
    } catch (err) {
      if (err.code !== "WA_NOT_CONNECTED") {
        console.error("Manual reply delivery failed:", err);
      }
    }
  }

  return res.status(201).json({
    success: true,
    data: {
      message: {
        id: message.id,
        direction: message.direction,
        body: message.body,
        timestamp: message.timestamp
      },
      delivered
    }
  });
});

module.exports = { list, getById, update, reply };
