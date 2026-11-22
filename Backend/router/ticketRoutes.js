const express = require("express");
const router = express.Router();

const ticketController = require("../controller/ticketcontroller");
router.get("/verify/:code", ticketController.verifyTicket);
// Create ticket
router.post("/", ticketController.createTicket);

// Read tickets
router.get("/my-tickets", ticketController.getMyTickets);
router.get("/:id", ticketController.getTicketById);

// Update ticket
router.put("/:id", ticketController.updateTicket);

// Cancel ticket
router.patch("/:id/cancel", ticketController.cancelTicket);

// Delete ticket
router.delete("/:id", ticketController.deleteTicket);

module.exports = router;
