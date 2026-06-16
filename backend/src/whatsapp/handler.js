// Transport-agnostic inbound message handler. Resolves the contact and active
// conversation, persists messages, runs the flow engine, and emits real-time
// events over Socket.IO. The actual WhatsApp transport is injected via
// `sendText`, which keeps this layer testable without a live connection.

const { Contact, Conversation, Message, Flow } = require("../models");
const { runFlow } = require("../flows/engine");

function emit(io, event, payload) {
  if (io && typeof io.emit === "function") {
    io.emit(event, payload);
  }
}

function serializeMessage(message, contact) {
  return {
    id: message.id,
    conversation_id: message.conversation_id,
    direction: message.direction,
    body: message.body,
    timestamp: message.timestamp,
    contact: contact
      ? { id: contact.id, phone_number: contact.phone_number, name: contact.name }
      : undefined
  };
}

async function handleIncomingMessage({ from, text, sendText, io }) {
  // 1. Resolve (or create) the contact.
  const [contact] = await Contact.findOrCreate({
    where: { phone_number: from },
    defaults: { phone_number: from, last_seen_at: new Date() }
  });
  contact.last_seen_at = new Date();
  await contact.save();

  // 2. Resolve the active conversation, or open a new one.
  let conversation = await Conversation.findOne({
    where: { contact_id: contact.id, status: "active" },
    order: [["id", "DESC"]]
  });
  if (!conversation) {
    conversation = await Conversation.create({
      contact_id: contact.id,
      status: "active",
      current_step: null,
      collected: {}
    });
    emit(io, "conversation:new", {
      id: conversation.id,
      contact_id: contact.id,
      status: conversation.status
    });
  }

  // 3. Persist the inbound message.
  const inbound = await Message.create({
    conversation_id: conversation.id,
    direction: "inbound",
    body: text
  });
  emit(io, "message:new", serializeMessage(inbound, contact));

  // 4. Load the active flow. Without one, we simply record the message.
  const flow = await Flow.findOne({
    where: { is_active: true },
    order: [["id", "ASC"]]
  });
  if (!flow) {
    return { conversation, contact, flow: null };
  }

  // 5. Each outbound reply is persisted, broadcast, then transmitted.
  const send = async (body) => {
    const outbound = await Message.create({
      conversation_id: conversation.id,
      direction: "outbound",
      body
    });
    emit(io, "message:new", serializeMessage(outbound, contact));
    if (typeof sendText === "function") {
      await sendText(body);
    }
  };

  // 6. Run the flow.
  await runFlow({ conversation, flow, text, send });
  emit(io, "conversation:update", {
    id: conversation.id,
    status: conversation.status,
    current_step: conversation.current_step,
    collected: conversation.collected
  });

  return { conversation, contact, flow };
}

module.exports = { handleIncomingMessage, serializeMessage };
