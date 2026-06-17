const { DataTypes, Sequelize } = require("sequelize");

const databaseUrl = process.env.DATABASE_URL;

// Managed Postgres providers reached over the public internet (Neon, Supabase,
// Render external URLs) require SSL. Enable it with DB_SSL=true; Render's
// internal connection string does not need it, so it defaults off.
const useSsl = process.env.DB_SSL === "true";

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false,
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
