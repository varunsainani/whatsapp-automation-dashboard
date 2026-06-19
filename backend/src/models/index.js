const { DataTypes, Sequelize } = require("sequelize");
// Bundle the Postgres driver explicitly. Sequelize loads its dialect module with
// a dynamic require, which file-tracing serverless bundlers (Vercel / @vercel/nft)
// can't follow — so `pg` gets omitted from the function and it crashes at boot
// with "Please install pg package manually". Requiring it here puts it in the
// trace, and passing it as dialectModule hands it straight to Sequelize.
const pg = require("pg");
require("pg-hstore");

const databaseUrl = process.env.DATABASE_URL;

// Managed Postgres providers reached over the public internet (Neon, Supabase,
// Render external URLs) require SSL. Enable it with DB_SSL=true; Render's
// internal connection string does not need it, so it defaults off.
const useSsl = process.env.DB_SSL === "true";

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  dialectModule: pg,
  logging: false,
  // Keep the pool small: on serverless (Vercel) each warm instance holds its own
  // pool, so a large max would quickly exhaust the database's connection limit.
  // min: 0 lets idle instances release connections back to the provider.
  pool: { max: 2, min: 0, idle: 10000, acquire: 30000 },
  ...(useSsl
    ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }
    : {})
});

const Admin = require("./Admin")(sequelize, DataTypes);
const Contact = require("./Contact")(sequelize, DataTypes);
const Conversation = require("./Conversation")(sequelize, DataTypes);
const Message = require("./Message")(sequelize, DataTypes);
const Flow = require("./Flow")(sequelize, DataTypes);
const Template = require("./Template")(sequelize, DataTypes);
const QuickReply = require("./QuickReply")(sequelize, DataTypes);

Contact.hasMany(Conversation, { foreignKey: "contact_id" });
Conversation.belongsTo(Contact, { foreignKey: "contact_id" });
Conversation.hasMany(Message, { foreignKey: "conversation_id" });
Message.belongsTo(Conversation, { foreignKey: "conversation_id" });

module.exports = {
  sequelize,
  Admin,
  Contact,
  Conversation,
  Message,
  Flow,
  Template,
  QuickReply
};
