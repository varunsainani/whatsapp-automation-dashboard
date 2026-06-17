const { fn, col } = require("sequelize");
const { Conversation, Contact, Message } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

const VALID_STATUSES = ["active", "closed"];

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/conversations
// Lists conversations newest-first, each enriched with its contact, the latest
// message preview and a total message count. Aggregates are gathered in a fixed
// number of queries rather than one-per-conversation.
const list = asyncHandler(async (req, res) => {
  const conversations = await Conversation.findAll({
    include: [{ model: Contact }],
    order: [["updated_at", "DESC"]]
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

  return res.json({ success: true, data });
});

// GET /api/conversations/:id
// Full conversation detail including the contact and the ordered message log.
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

// PATCH /api/conversations/:id
// Updates the conversation status (active/closed). Emits conversation:update so
// connected admin panels reflect the change in real time.
const updateStatus = asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid conversation id" });
  }

  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res
      .status(400)
      .json({ success: false, message: "status must be 'active' or 'closed'" });
  }

  const conversation = await Conversation.findByPk(id);
  if (!conversation) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }

  conversation.status = status;
  conversation.updated_at = new Date();
  await conversation.save();

  const io = req.app.get("io");
  if (io && typeof io.emit === "function") {
    io.emit("conversation:update", {
      id: conversation.id,
      status: conversation.status,
      current_step: conversation.current_step,
      collected: conversation.collected
    });
  }

  return res.json({
    success: true,
    data: { id: conversation.id, status: conversation.status }
  });
});

module.exports = { list, getById, updateStatus };
