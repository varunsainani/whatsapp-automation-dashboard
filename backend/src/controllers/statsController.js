const { fn, col, Op } = require("sequelize");
const { Conversation, Contact, Message } = require("../models");
const asyncHandler = require("../utils/asyncHandler");

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date) {
  // Local YYYY-MM-DD key.
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// GET /api/stats
// Dashboard metrics: totals, conversation breakdown, completion rate, and a
// 7-day message volume series for the chart.
const overview = asyncHandler(async (req, res) => {
  const [
    totalContacts,
    totalConversations,
    activeConversations,
    closedConversations,
    completedConversations,
    totalMessages
  ] = await Promise.all([
    Contact.count(),
    Conversation.count(),
    Conversation.count({ where: { status: "active" } }),
    Conversation.count({ where: { status: "closed" } }),
    Conversation.count({ where: { current_step: "done" } }),
    Message.count()
  ]);

  // Message direction breakdown.
  const directionRows = await Message.findAll({
    attributes: ["direction", [fn("COUNT", col("id")), "count"]],
    group: ["direction"],
    raw: true
  });
  const byDirection = { inbound: 0, outbound: 0 };
  for (const row of directionRows) {
    byDirection[row.direction] = Number(row.count);
  }

  // 7-day message volume (oldest -> newest), zero-filled.
  const today = startOfDay(new Date());
  const since = new Date(today);
  since.setDate(since.getDate() - 6);

  const dayRows = await Message.findAll({
    attributes: [
      [fn("date_trunc", "day", col("timestamp")), "day"],
      [fn("COUNT", col("id")), "count"]
    ],
    where: { timestamp: { [Op.gte]: since } },
    group: [fn("date_trunc", "day", col("timestamp"))],
    raw: true
  });
  const dayMap = {};
  for (const row of dayRows) {
    dayMap[dateKey(row.day)] = Number(row.count);
  }

  const messagesPerDay = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    messagesPerDay.push({
      date: key,
      label: d.toLocaleDateString([], { weekday: "short" }),
      count: dayMap[key] || 0
    });
  }

  const completionRate =
    totalConversations > 0
      ? Math.round((completedConversations / totalConversations) * 100)
      : 0;

  return res.json({
    success: true,
    data: {
      totals: {
        contacts: totalContacts,
        conversations: totalConversations,
        messages: totalMessages
      },
      conversations: {
        active: activeConversations,
        closed: closedConversations,
        completed: completedConversations,
        completionRate
      },
      messages: {
        inbound: byDirection.inbound,
        outbound: byDirection.outbound
      },
      messagesPerDay
    }
  });
});

module.exports = { overview };
