require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");

const routes = require("./routes");
const { sequelize } = require("./models");
const { initSocket } = require("./socket");
const seedAdmin = require("./seed/admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(routes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);
const io = initSocket(server);
app.set("io", io);

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established");

    await sequelize.sync();
    console.log("Database models synchronized");

    await seedAdmin();

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
