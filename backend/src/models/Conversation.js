module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Conversation",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      contact_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "contacts",
          key: "id"
        }
      },
      status: {
        type: DataTypes.ENUM("active", "closed"),
        allowNull: false,
        defaultValue: "active"
      },
      current_step: {
        type: DataTypes.STRING,
        allowNull: true
      },
      collected: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: "conversations",
      timestamps: false
    }
  );
