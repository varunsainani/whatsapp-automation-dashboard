const { Flow } = require("../models");

// A simple lead-capture flow used out of the box. Editable later from the admin
// panel without touching code.
const DEFAULT_FLOW = {
  name: "Default Lead Capture",
  is_active: true,
  steps: [
    {
      type: "say",
      text: "👋 Hi! Welcome to Acme Co. I'll ask a few quick questions to get you started."
    },
    { type: "ask", key: "name", text: "What's your full name?" },
    {
      type: "ask",
      key: "email",
      text: "Thanks {name}! What's the best email to reach you?"
    },
    {
      type: "ask",
      key: "interest",
      text: "Great. What are you interested in? (e.g. Sales, Support, Pricing)"
    },
    {
      type: "say",
      text: '✅ All set, {name}! Our team will contact you at {email} about "{interest}". 🙌'
    }
  ]
};

async function seedFlow() {
  const existing = await Flow.findOne({ where: { is_active: true } });
  if (existing) {
    return existing;
  }
  const flow = await Flow.create(DEFAULT_FLOW);
  console.log(`Seeded default flow: ${flow.name}`);
  return flow;
}

module.exports = seedFlow;
module.exports.DEFAULT_FLOW = DEFAULT_FLOW;
