
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as QRCode from 'qrcode';
import { TicketService, Ticket } from '../services/ticket.service';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.css'
})
export class TicketsComponent implements OnInit {

  userId = 1;
  eventId: number | null = null;

  tickets: Ticket[] = [];
  qrCodes: { [key: number]: string } = {};

  message = '';
  errorMessage = '';
  loading = false;

  constructor(private ticketService: TicketService) {}

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading = true;

    this.ticketService.getMyTickets(this.userId).subscribe({
      next: (data) => {
        this.tickets = data;
        this.loading = false;

        this.tickets.forEach(ticket => {
          this.generateQRCode(ticket);
        });
      },
      error: (error) => {
        console.error(error);
        this.errorMessage = 'Unable to load tickets';
        this.loading = false;
      }
    });
  }

  bookTicket(): void {
    if (!this.eventId || this.eventId <= 0) {
      this.errorMessage = 'Enter a valid Event ID';
      return;
    }

    this.loading = true;
    this.message = '';
    this.errorMessage = '';

    this.ticketService.bookTicket(
      this.userId,
      this.eventId
    ).subscribe({
      next: () => {
        this.message = 'Ticket booked successfully!';
        this.eventId = null;
        this.loadTickets();
      },
      error: (error) => {
        console.error(error);
        this.errorMessage = 'Booking failed';
        this.loading = false;
      }
    });
  }

  cancelTicket(ticketId: number): void {
    if (!confirm('Cancel this ticket?')) return;

    this.ticketService.cancelTicket(ticketId).subscribe({
      next: () => {
        this.message = 'Ticket cancelled!';
        this.loadTickets();
      },
      error: (error) => {
        console.error(error);
        this.errorMessage = 'Cancellation failed';
      }
    });
  }

  async generateQRCode(ticket: Ticket): Promise<void> {
    const data = JSON.stringify({
      ticket_id: ticket.id,
      ticket_code: ticket.ticket_code,
      event_id: ticket.event_id
    });

    this.qrCodes[ticket.id] = await QRCode.toDataURL(data);
  }
}
