const { Sequelize } = require("sequelize");

const databaseUrl = process.env.DATABASE_URL;

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false
});

module.exports = {
  sequelize
};
