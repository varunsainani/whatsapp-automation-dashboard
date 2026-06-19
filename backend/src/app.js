const express = require("express");
const cors = require("cors");

const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

// Builds the Express application: middleware, REST routes, health check and the
// error responder. Deliberately free of any server/transport concerns (no
// app.listen, no Socket.IO, no WhatsApp client, no DB sync) so the exact same
// app can run as a long-lived Node server (src/index.js) or as a stateless
// Vercel serverless function (api/index.js).
function createApp() {
  const app = express();

  // Lock CORS to the deployed frontend in production via CORS_ORIGIN; defaults
  // to "*" for local development.
  const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

  app.use(cors({ origin: CORS_ORIGIN }));
  app.use(express.json());
  app.use(routes);

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Error responder — must be registered after the routes.
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
