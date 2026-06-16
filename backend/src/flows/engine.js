// Conversation flow engine.
//
// A flow is an ordered array of steps stored on the Flow model (`steps` JSONB):
//   { type: "say", text }            -> bot sends text and auto-advances
//   { type: "ask", key, text }       -> bot sends text, waits, stores the reply under `key`
//
// Conversation state is tracked with:
//   current_step: null   -> brand new (not started)
//                 "<n>"  -> waiting for the answer to the ask-step at index n
//                 "done" -> flow completed
//   collected:    map of answer key -> value

function interpolate(text, data) {
  return String(text).replace(/\{(\w+)\}/g, (match, key) =>
    data[key] !== undefined && data[key] !== null ? String(data[key]) : ""
  );
}

// Advances the conversation by one inbound message. Sends each bot reply via
// `send(text)` and persists the updated conversation state.
async function runFlow({ conversation, flow, text, send }) {
  const steps = Array.isArray(flow && flow.steps) ? flow.steps : [];
  if (steps.length === 0) {
    return {
      replies: [],
      current_step: conversation.current_step,
      collected: conversation.collected || {}
    };
  }

  let data = { ...(conversation.collected || {}) };
  let cursor;

  if (conversation.current_step === "done") {
    // Completed flow: a new message restarts it from the top.
    data = {};
    cursor = 0;
  } else if (
    conversation.current_step === null ||
    conversation.current_step === undefined
  ) {
    // Brand new conversation: the first message triggers the intro; it is not
    // consumed as an answer.
    cursor = 0;
  } else {
    // Waiting for the answer to the ask-step at this index.
    const askIdx = Number(conversation.current_step);
    const askStep = steps[askIdx];
    if (askStep && askStep.type === "ask" && askStep.key) {
      data[askStep.key] = text;
    }
    cursor = (Number.isNaN(askIdx) ? -1 : askIdx) + 1;
  }

  const replies = [];
  let nextStep = "done";
  while (cursor < steps.length) {
    const step = steps[cursor];
    replies.push(interpolate(step.text, data));
    if (step.type === "ask") {
      nextStep = String(cursor);
      break;
    }
    cursor += 1;
  }

  for (const reply of replies) {
    await send(reply);
  }

  conversation.current_step = nextStep;
  conversation.collected = data;
  conversation.status = nextStep === "done" ? "closed" : "active";
  conversation.updated_at = new Date();
  await conversation.save();

  return { replies, current_step: nextStep, collected: data };
}

module.exports = { runFlow, interpolate };
