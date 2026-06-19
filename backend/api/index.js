// Vercel serverless entry point. The whole Express app is exported as a single
// function (an Express app is itself a (req, res) handler). There is no
// app.listen here — Vercel invokes this per request. Real-time Socket.IO and
// the Baileys WhatsApp client are intentionally absent: a serverless function
// has no persistent process to hold those connections, so the admin panel falls
// back to short-interval polling and the hosted demo runs WHATSAPP_ENABLED=false.
//
// The database schema/seed is provisioned once out-of-band via
// `npm run init-db` (scripts/init-db.js) against the same DATABASE_URL, so this
// handler never calls sequelize.sync(); it only reads/writes existing tables.
const createApp = require("../src/app");

module.exports = createApp();
