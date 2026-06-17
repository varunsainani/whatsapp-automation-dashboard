const { Contact, Conversation, Message } = require("../models");

// Optional demo data so the dashboard looks populated out of the box. Only runs
// when SEED_SAMPLE_DATA=true and the contacts table is empty, so it never
// touches a real deployment's data.
const SAMPLE = [
  {
    phone: "15551234001",
    name: "Maria Gomez",
    status: "closed",
    step: "done",
    collected: { name: "Maria Gomez", email: "maria@example.com", interest: "Pricing" },
    daysAgo: 5,
    transcript: [
      ["inbound", "Hi, I saw your ad"],
      ["outbound", "👋 Hi! Welcome to Acme Co. I'll ask a few quick questions to get you started."],
      ["outbound", "What's your full name?"],
      ["inbound", "Maria Gomez"],
      ["outbound", "Thanks Maria Gomez! What's the best email to reach you?"],
      ["inbound", "maria@example.com"],
      ["outbound", "Great. What are you interested in? (e.g. Sales, Support, Pricing)"],
      ["inbound", "Pricing"],
      ["outbound", '✅ All set, Maria Gomez! Our team will contact you at maria@example.com about "Pricing". 🙌']
    ]
  },
  {
    phone: "15551234002",
    name: "James Lee",
    status: "active",
    step: "2",
    collected: { name: "James Lee" },
    daysAgo: 1,
    transcript: [
      ["inbound", "hello"],
      ["outbound", "👋 Hi! Welcome to Acme Co. I'll ask a few quick questions to get you started."],
      ["outbound", "What's your full name?"],
      ["inbound", "James Lee"],
      ["outbound", "Thanks James Lee! What's the best email to reach you?"]
    ]
  },
  {
    phone: "15551234003",
    name: "Aisha Khan",
    status: "closed",
    step: "done",
    collected: { name: "Aisha Khan", email: "aisha@example.com", interest: "Support" },
    daysAgo: 3,
    transcript: [
      ["inbound", "need help with my order"],
      ["outbound", "👋 Hi! Welcome to Acme Co. I'll ask a few quick questions to get you started."],
      ["outbound", "What's your full name?"],
      ["inbound", "Aisha Khan"],
      ["outbound", "Thanks Aisha Khan! What's the best email to reach you?"],
      ["inbound", "aisha@example.com"],
      ["outbound", "Great. What are you interested in? (e.g. Sales, Support, Pricing)"],
      ["inbound", "Support"],
      ["outbound", '✅ All set, Aisha Khan! Our team will contact you at aisha@example.com about "Support". 🙌']
    ]
  },
  {
    phone: "15551234004",
    name: null,
    status: "active",
    step: null,
    collected: {},
    daysAgo: 0,
    transcript: [["inbound", "Hi there"]]
  }
];

async function seedSample() {
  if (process.env.SEED_SAMPLE_DATA !== "true") return;

  const existing = await Contact.count();
  if (existing > 0) return;

  const now = Date.now();
  for (const lead of SAMPLE) {
    const base = now - lead.daysAgo * 24 * 60 * 60 * 1000;
    const contact = await Contact.create({
      phone_number: lead.phone,
      name: lead.name,
      last_seen_at: new Date(base + lead.transcript.length * 60000)
    });
    const conversation = await Conversation.create({
      contact_id: contact.id,
      status: lead.status,
      current_step: lead.step,
      collected: lead.collected,
      started_at: new Date(base)
    });
    for (let i = 0; i < lead.transcript.length; i += 1) {
      const [direction, body] = lead.transcript[i];
      await Message.create({
        conversation_id: conversation.id,
        direction,
        body,
        timestamp: new Date(base + i * 60000)
      });
    }
  }
  console.log(`Seeded ${SAMPLE.length} sample conversations`);
}

module.exports = seedSample;
