const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("viebly_db", "root", "", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("MySQL connected successfully!");
  } catch (error) {
    console.error("Database connection failed:");
    console.error(error);
    throw error;
  }
};

module.exports = { sequelize, connectDB };
