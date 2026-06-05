const { DataTypes, Sequelize } = require("sequelize");

const databaseUrl = process.env.DATABASE_URL;

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false
});

const Admin = require("./Admin")(sequelize, DataTypes);
const Contact = require("./Contact")(sequelize, DataTypes);
const Conversation = require("./Conversation")(sequelize, DataTypes);
const Message = require("./Message")(sequelize, DataTypes);
const Flow = require("./Flow")(sequelize, DataTypes);
const Template = require("./Template")(sequelize, DataTypes);
const QuickReply = require("./QuickReply")(sequelize, DataTypes);

Contact.hasMany(Conversation, { foreignKey: "contact_id" });
Conversation.hasMany(Message, { foreignKey: "conversation_id" });

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
