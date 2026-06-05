module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "QuickReply",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      label: {
        type: DataTypes.STRING,
        allowNull: false
      },
      response_text: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: "quick_replies",
      timestamps: false
    }
  );
