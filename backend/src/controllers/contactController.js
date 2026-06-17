const { Op } = require("sequelize");
const { Contact, Conversation } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

// Returns a map of contact_id -> { collected, status, conversation_id }. The
// collected data is merged across all of a contact's conversations (newer
// values win) so a lead's details survive even if they later start a fresh
// chat; status and conversation_id reflect the most recent conversation.
async function leadDataFor(contactIds) {
  const map = {};
  if (contactIds.length === 0) return map;
  const conversations = await Conversation.findAll({
    where: { contact_id: contactIds },
    order: [["id", "ASC"]] // oldest first so the newest values overwrite
  });
  for (const c of conversations) {
    const entry = map[c.contact_id] || {
      collected: {},
      status: null,
      conversation_id: null
    };
    entry.collected = { ...entry.collected, ...(c.collected || {}) };
    entry.status = c.status;
    entry.conversation_id = c.id;
    map[c.contact_id] = entry;
  }
  return map;
}

function buildSearchWhere(q) {
  if (!q || !q.trim()) return {};
  return {
    [Op.or]: [
      { name: { [Op.iLike]: `%${q.trim()}%` } },
      { phone_number: { [Op.iLike]: `%${q.trim()}%` } }
    ]
  };
}

function toLead(contact, lead) {
  return {
    id: contact.id,
    phone_number: contact.phone_number,
    name: contact.name,
    created_at: contact.created_at,
    last_seen_at: contact.last_seen_at,
    collected: lead ? lead.collected || {} : {},
    status: lead ? lead.status : null,
    conversation_id: lead ? lead.conversation_id : null
  };
}

// GET /api/contacts?q=&page=&limit=
// Leads list: contacts enriched with the data collected in their latest chat.
const list = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const where = buildSearchWhere(q);

  const { rows: contacts, count: total } = await Contact.findAndCountAll({
    where,
    order: [["last_seen_at", "DESC NULLS LAST"], ["id", "DESC"]],
    limit,
    offset: (page - 1) * limit
  });

  const leads = await leadDataFor(contacts.map((c) => c.id));
  const data = contacts.map((c) => toLead(c, leads[c.id]));

  return res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

function csvCell(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// GET /api/contacts/export
// Streams all leads as CSV. Collected-data keys become dynamic columns.
const exportCsv = asyncHandler(async (req, res) => {
  const contacts = await Contact.findAll({
    order: [["id", "ASC"]]
  });
  const leadMap = await leadDataFor(contacts.map((c) => c.id));
  const leads = contacts.map((c) => toLead(c, leadMap[c.id]));

  // Union of collected keys across all leads -> dynamic columns.
  const collectedKeys = [];
  for (const lead of leads) {
    for (const key of Object.keys(lead.collected || {})) {
      if (!collectedKeys.includes(key)) collectedKeys.push(key);
    }
  }

  const header = [
    "phone_number",
    "name",
    "status",
    "created_at",
    ...collectedKeys
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const lead of leads) {
    const row = [
      lead.phone_number,
      lead.name,
      lead.status,
      lead.created_at ? new Date(lead.created_at).toISOString() : "",
      ...collectedKeys.map((k) => lead.collected[k])
    ];
    lines.push(row.map(csvCell).join(","));
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="leads.csv"');
  return res.send(lines.join("\n"));
});

module.exports = { list, exportCsv };
