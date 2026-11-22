const express = require("express");
const cors = require("cors");

const { connectDB } = require("./config/db");

const ticketRoutes = require("./router/ticketRoutes");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "VIBELY API is running",
  });
});

// Ticket routes
app.use("/api/tickets", ticketRoutes);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`VIBELY Server running on port ${PORT}`);
  });
};

startServer();
