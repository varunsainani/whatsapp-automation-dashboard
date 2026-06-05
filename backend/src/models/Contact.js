module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Contact",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      phone_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      last_seen_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      tableName: "contacts",
      timestamps: false
    }
  );
