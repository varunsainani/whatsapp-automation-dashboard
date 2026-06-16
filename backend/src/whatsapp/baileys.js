// WhatsApp transport via Baileys (free, no paid API). On first run it prints a
// QR code to scan in WhatsApp > Linked Devices; the session is then persisted
// to disk so subsequent starts reconnect automatically.

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const { handleIncomingMessage } = require("./handler");

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || "whatsapp-session";

// Minimal pino-compatible logger so Baileys stays quiet without pulling in a
// direct pino dependency.
const silentLogger = {
  level: "silent",
  trace() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
  fatal() {},
  child() {
    return silentLogger;
  }
};

function extractText(message) {
  const m = (message && message.message) || {};
  return (
    m.conversation ||
    (m.extendedTextMessage && m.extendedTextMessage.text) ||
    (m.imageMessage && m.imageMessage.caption) ||
    (m.videoMessage && m.videoMessage.caption) ||
    ""
  ).trim();
}

async function initWhatsApp({ io } = {}) {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({
    auth: state,
    logger: silentLogger,
    browser: ["WhatsApp Dashboard", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("Scan this QR code in WhatsApp > Linked Devices:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("WhatsApp connection established");
    } else if (connection === "close") {
      const statusCode =
        lastDisconnect &&
        lastDisconnect.error &&
        lastDisconnect.error.output &&
        lastDisconnect.error.output.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(
        `WhatsApp connection closed${
          loggedOut ? " (logged out)" : ", reconnecting..."
        }`
      );
      if (!loggedOut) {
        initWhatsApp({ io });
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") {
      return;
    }
    for (const msg of messages) {
      try {
        if (!msg.message || (msg.key && msg.key.fromMe)) {
          continue;
        }
        const jid = msg.key && msg.key.remoteJid;
        if (!jid || jid === "status@broadcast" || jid.endsWith("@g.us")) {
          continue; // ignore status updates and group chats
        }
        const text = extractText(msg);
        if (!text) {
          continue;
        }
        const phone = jid.split("@")[0];
        await handleIncomingMessage({
          from: phone,
          text,
          io,
          sendText: (body) => sock.sendMessage(jid, { text: body })
        });
      } catch (err) {
        console.error("Failed to handle incoming message:", err);
      }
    }
  });

  return sock;
}

module.exports = { initWhatsApp, extractText };
