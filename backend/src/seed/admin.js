const bcrypt = require("bcryptjs");
const { Admin } = require("../models");

// Ensures a single admin account exists, derived from environment variables.
// ADMIN_PASSWORD is supplied as plaintext and stored as a bcrypt hash.
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD not set; skipping admin seed");
    return;
  }

  const existing = await Admin.findOne({ where: { email } });
  if (existing) {
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);
  await Admin.create({ email, password_hash });
  console.log(`Seeded admin account: ${email}`);
}

module.exports = seedAdmin;
