const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Ticket = sequelize.define(
  "Ticket",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    event_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    ticket_code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },

    status: {
      type: DataTypes.ENUM("booked", "cancelled"),
      allowNull: false,
      defaultValue: "booked",
    },

    booked_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "tickets",
    timestamps: false,
    freezeTableName: true,
  }
);

module.exports = Ticket;
