// WhatsApp transport via Baileys (free, no paid API). On first run it prints a
// QR code to scan in WhatsApp > Linked Devices; the session is then persisted
// to disk so subsequent starts reconnect automatically.
//
// This module keeps a single live socket and exposes a small controller so the
// rest of the app can send messages (manual agent replies) and read connection
// status without knowing about Baileys internals. Connection changes and QR
// codes are broadcast over Socket.IO as "whatsapp:status".

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const { handleIncomingMessage } = require("./handler");

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || "whatsapp-session";

// Mutable module state for the single connection.
let sock = null;
let ioRef = null;
let status = { connected: false, qr: null };

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

function toJid(to) {
  if (!to) return null;
  return String(to).includes("@") ? String(to) : `${to}@s.whatsapp.net`;
}

function emitStatus() {
  if (ioRef && typeof ioRef.emit === "function") {
    ioRef.emit("whatsapp:status", {
      connected: status.connected,
      hasQR: !!status.qr
    });
  }
}

// Public: current connection status. `qr` is included so an admin panel can
// render the pairing code if desired.
function getStatus() {
  return {
    connected: status.connected,
    hasQR: !!status.qr,
    qr: status.qr
  };
}

// Public: send a plain-text WhatsApp message. Throws WA_NOT_CONNECTED when the
// transport is unavailable so callers can degrade gracefully.
async function sendText(to, text) {
  if (!sock || !status.connected) {
    const err = new Error("WhatsApp is not connected");
    err.code = "WA_NOT_CONNECTED";
    throw err;
  }
  const jid = toJid(to);
  await sock.sendMessage(jid, { text });
  return true;
}

async function initWhatsApp({ io } = {}) {
  if (io) ioRef = io;
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  sock = makeWASocket({
    auth: state,
    logger: silentLogger,
    browser: ["WhatsApp Dashboard", "Chrome", "1.0.0"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      status.qr = qr;
      console.log("Scan this QR code in WhatsApp > Linked Devices:");
      qrcode.generate(qr, { small: true });
      emitStatus();
    }

    if (connection === "open") {
      status.connected = true;
      status.qr = null;
      console.log("WhatsApp connection established");
      emitStatus();
    } else if (connection === "close") {
      status.connected = false;
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
      emitStatus();
      if (!loggedOut) {
        initWhatsApp({ io: ioRef });
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
          io: ioRef,
          sendText: (body) => sock.sendMessage(jid, { text: body })
        });
      } catch (err) {
        console.error("Failed to handle incoming message:", err);
      }
    }
  });

  return sock;
}

module.exports = { initWhatsApp, sendText, getStatus, extractText };
