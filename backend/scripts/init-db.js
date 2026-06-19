require("dotenv").config();

// One-time database provisioner for the serverless deployment. Run this once
// against the production DATABASE_URL (e.g. Neon) before/after deploying:
//
//   DATABASE_URL=postgres://... DB_SSL=true SEED_SAMPLE_DATA=true \
//     ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret node scripts/init-db.js
//
// It connects, creates/updates the tables (sequelize.sync), seeds the admin
// account + default flow, and optionally seeds demo conversations/leads. The
// serverless request handler (api/index.js) deliberately does NOT do this, so
// every cold start stays fast and read/write-only.
const { sequelize } = require("../src/models");
const seedAdmin = require("../src/seed/admin");
const seedFlow = require("../src/seed/flow");
const seedSample = require("../src/seed/sample");

async function main() {
  await sequelize.authenticate();
  console.log("Database connection established");

  await sequelize.sync();
  console.log("Database models synchronized");

  await seedAdmin();
  await seedFlow();
  await seedSample();

  console.log("Initialization complete");
  await sequelize.close();
}

main().catch((err) => {
  console.error("init-db failed:", err);
  process.exit(1);
});
