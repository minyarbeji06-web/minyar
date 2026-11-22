const { QueryTypes } = require("sequelize");
const { randomUUID } = require("crypto");

const { sequelize } = require("../config/db");
const Ticket = require("../model/ticket");

// ==========================================
// 1. CREATE TICKET + BOOKING
// ==========================================

exports.createTicket = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { event_id } = req.body;
    const user_id = req.user?.id || req.body.user_id;

    if (!user_id || !event_id) {
      await transaction.rollback();

      return res.status(400).json({
        message: "user_id and event_id are required",
      });
    }

    // Lock event to prevent simultaneous overbooking
    const events = await sequelize.query(
      `SELECT id, available_seats
       FROM events
       WHERE id = :event_id
       FOR UPDATE`,
      {
        replacements: { event_id },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (events.length === 0) {
      await transaction.rollback();

      return res.status(404).json({
        message: "Event not found",
      });
    }

    // Prevent duplicate active booking
    const existingTickets = await sequelize.query(
      `SELECT id
       FROM tickets
       WHERE user_id = :user_id
       AND event_id = :event_id
       AND status = 'booked'
       LIMIT 1`,
      {
        replacements: { user_id, event_id },
        type: QueryTypes.SELECT,
        transaction,
      }
    );

    if (existingTickets.length > 0) {
      await transaction.rollback();

      return res.status(409).json({
        message: "You already have an active ticket for this event",
      });
    }

    // Check available seats
    if (events[0].available_seats <= 0) {
      await transaction.rollback();

      return res.status(400).json({
        message: "No available seats",
      });
    }

    // Decrease available seats
    await sequelize.query(
      `UPDATE events
       SET available_seats = available_seats - 1
       WHERE id = :event_id
       AND available_seats > 0`,
      {
        replacements: { event_id },
        transaction,
      }
    );

    // Generate unique ticket code
    const ticket_code = "VIB-" + randomUUID();

    // Create ticket
    const ticket = await Ticket.create(
      {
        user_id,
        event_id,
        ticket_code,
        status: "booked",
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(201).json({
      message: "Ticket booked successfully",
      ticket,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("CREATE TICKET ERROR:", error);

    return res.status(500).json({
      message: "Booking failed",
      error: error.message,
    });
  }
};

// ==========================================
// 2. GET MY TICKETS
// ==========================================

exports.getMyTickets = async (req, res) => {
  try {
    const user_id = req.query.user_id || req.user?.id;

    if (!user_id) {
      return res.status(400).json({
        message: "user_id is required",
      });
    }

    const tickets = await sequelize.query(
      `SELECT
          t.*,
          e.title AS event_title,
          e.start_date
       FROM tickets t
       INNER JOIN events e ON t.event_id = e.id
       WHERE t.user_id = :user_id
       ORDER BY t.booked_at DESC`,
      {
        replacements: { user_id },
        type: QueryTypes.SELECT,
      }
    );

    return res.status(200).json(tickets);
  } catch (error) {
    console.error("GET MY TICKETS ERROR:", error);

    return res.status(500).json({
      message: "Failed to retrieve tickets",
      error: error.message,
    });
  }
};

// ==========================================
// 3. GET TICKET BY ID
// ==========================================

exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    const tickets = await sequelize.query(
      `SELECT
          t.*,
          e.title AS event_title,
          e.start_date
       FROM tickets t
       INNER JOIN events e ON t.event_id = e.id
       WHERE t.id = :id`,
      {
        replacements: { id },
        type: QueryTypes.SELECT,
      }
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    return res.status(200).json(tickets[0]);
  } catch (error) {
    console.error("GET TICKET ERROR:", error);

    return res.status(500).json({
      message: "Failed to retrieve ticket",
      error: error.message,
    });
  }
};

// ==========================================
// 4. UPDATE TICKET
// ==========================================

exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { ticket_code } = req.body;

    const ticket = await Ticket.findByPk(id);

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (ticket.status === "cancelled") {
      return res.status(400).json({
        message: "Cannot update a cancelled ticket",
      });
    }

    if (!ticket_code || !ticket_code.trim()) {
      return res.status(400).json({
        message: "ticket_code is required",
      });
    }

    await ticket.update({
      ticket_code: ticket_code.trim(),
    });

    return res.status(200).json({
      message: "Ticket updated successfully",
      ticket,
    });
  } catch (error) {
    console.error("UPDATE TICKET ERROR:", error);

    return res.status(500).json({
      message: "Failed to update ticket",
      error: error.message,
    });
  }
};

// ==========================================
// 5. CANCEL TICKET
// ==========================================

exports.cancelTicket = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    // Lock ticket
    const ticket = await Ticket.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!ticket) {
      await transaction.rollback();

      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (ticket.status === "cancelled") {
      await transaction.rollback();

      return res.status(400).json({
        message: "Ticket is already cancelled",
      });
    }

    // Change ticket status
    await ticket.update({ status: "cancelled" }, { transaction });

    // Return one seat to the event
    await sequelize.query(
      `UPDATE events
       SET available_seats = available_seats + 1
       WHERE id = :event_id`,
      {
        replacements: {
          event_id: ticket.event_id,
        },
        transaction,
      }
    );

    await transaction.commit();

    return res.status(200).json({
      message: "Ticket cancelled successfully",
      ticket,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("CANCEL TICKET ERROR:", error);

    return res.status(500).json({
      message: "Failed to cancel ticket",
      error: error.message,
    });
  }
};

// ==========================================
// 6. DELETE TICKET
// ==========================================

exports.deleteTicket = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const ticket = await Ticket.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!ticket) {
      await transaction.rollback();

      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    // Return seat only if ticket is still booked
    if (ticket.status === "booked") {
      await sequelize.query(
        `UPDATE events
         SET available_seats = available_seats + 1
         WHERE id = :event_id`,
        {
          replacements: {
            event_id: ticket.event_id,
          },
          transaction,
        }
      );
    }

    await ticket.destroy({ transaction });

    await transaction.commit();

    return res.status(200).json({
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("DELETE TICKET ERROR:", error);

    return res.status(500).json({
      message: "Failed to delete ticket",
      error: error.message,
    });
  }
};

// ==========================================
// 7. VERIFY TICKET BY QR CODE
// ==========================================

exports.verifyTicket = async (req, res) => {
  try {
    const { code } = req.params;

    const tickets = await sequelize.query(
      `SELECT
          t.id,
          t.ticket_code,
          t.status,
          t.booked_at,
          e.title AS event_title,
          e.start_date
       FROM tickets t
       INNER JOIN events e ON t.event_id = e.id
       WHERE t.ticket_code = :code`,
      {
        replacements: { code },
        type: QueryTypes.SELECT,
      }
    );

    if (tickets.length === 0) {
      return res.status(404).json({
        valid: false,
        message: "Ticket not found",
      });
    }

    const ticket = tickets[0];

    if (ticket.status !== "booked") {
      return res.status(200).json({
        valid: false,
        message: "Ticket cancelled",
        ticket,
      });
    }

    return res.status(200).json({
      valid: true,
      message: "Ticket is valid",
      ticket,
    });
  } catch (error) {
    console.error("VERIFY TICKET ERROR:", error);

    return res.status(500).json({
      valid: false,
      message: "Ticket verification failed",
      error: error.message,
    });
  }
};
