require("dotenv").config();

const http = require("http");

const createApp = require("./app");
const { sequelize } = require("./models");
const { initSocket } = require("./socket");
const seedAdmin = require("./seed/admin");
const seedFlow = require("./seed/flow");
const seedSample = require("./seed/sample");
const whatsapp = require("./whatsapp/baileys");

const app = createApp();
const PORT = process.env.PORT || 3000;

// Long-lived server: attach the realtime + WhatsApp transports that only make
// sense when a persistent process is running. (The serverless deployment uses
// api/index.js, which skips all of this and degrades to REST + polling.)
const server = http.createServer(app);
const io = initSocket(server);
app.set("io", io);
// Expose the WhatsApp controller so routes can send messages / read status.
app.set("whatsapp", whatsapp);

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established");

    await sequelize.sync();
    console.log("Database models synchronized");

    await seedAdmin();
    await seedFlow();
    await seedSample();

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    if (process.env.WHATSAPP_ENABLED !== "false") {
      try {
        await whatsapp.initWhatsApp({ io });
      } catch (err) {
        console.error("WhatsApp initialization failed (server still running):", err);
      }
    } else {
      console.log("WhatsApp disabled (WHATSAPP_ENABLED=false)");
    }
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
