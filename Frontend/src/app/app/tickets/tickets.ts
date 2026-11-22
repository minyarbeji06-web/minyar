
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as QRCode from 'qrcode';

import {
  TicketService,
  Ticket
} from '../services/ticket.service';

interface TicketWithEvent extends Ticket {
  title?: string;
  event_title?: string;
  start_date?: string;
  capacity?: number;
  available_seats?: number;
  booked_seats?: number;
  booked_percentage?: number;
}

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tickets.html',
  styleUrl: './tickets.css'
})
export class Tickets implements OnInit, OnDestroy {

  userId = 1;
  eventId: number | null = null;

  tickets: TicketWithEvent[] = [];

  qrCodes: { [key: number]: string } = {};
  countdowns: { [key: number]: string } = {};

  loading = false;
  message = '';
  errorMessage = '';

  // 3D TICKET FLIP
  flippedTicketId: number | null = null;

  flipTicket(ticketId: number): void {
    this.flippedTicketId =
      this.flippedTicketId === ticketId ? null : ticketId;
  }


  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private ticketService: TicketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTickets();

    this.countdownInterval = setInterval(() => {
      this.updateCountdowns();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  // STATISTICS

  get totalTickets(): number {
    return this.tickets.length;
  }

  get activeTickets(): number {
    return this.tickets.filter(
      ticket => ticket.status === 'booked'
    ).length;
  }

  get cancelledTickets(): number {
    return this.tickets.filter(
      ticket => ticket.status === 'cancelled'
    ).length;
  }

  // AVAILABLE SEATS

  getBookedPercentage(ticket: TicketWithEvent): number {
    if (!ticket.capacity || ticket.capacity <= 0) {
      return 0;
    }

    const percentage =
      ((ticket.capacity - (ticket.available_seats ?? 0)) /
        ticket.capacity) * 100;

    return Math.min(100, Math.max(0, percentage));
  }

  getSeatsMessage(ticket: TicketWithEvent): string {
    const seats = ticket.available_seats;

    if (seats === undefined || seats === null) {
      return 'Seats information unavailable';
    }

    if (seats === 0) {
      return 'Sold Out';
    }

    if (seats <= 10) {
      return 'Hurry! Few seats left';
    }

    return 'Seats available';
  }

  // LOAD TICKETS

  loadTickets(): void {

    this.ticketService.getMyTickets(this.userId).subscribe({

      next: async (data: Ticket[]) => {

        console.log('TICKETS RECEIVED:', data);

        this.tickets = data as TicketWithEvent[];
        this.qrCodes = {};

        this.updateCountdowns();

        this.cdr.detectChanges();

        try {

          for (const ticket of this.tickets) {

            this.qrCodes[ticket.id] = await QRCode.toDataURL(
              ticket.ticket_code,
              {
                width: 200,
                margin: 2,
                errorCorrectionLevel: 'H',
                color: {
                  dark: '#5C4033',
                  light: '#FFFFFF'
                }
              }
            );

          }

          console.log('QR CODES GENERATED:', this.qrCodes);

          this.cdr.detectChanges();

        } catch (error) {

          console.error('QR CODE GENERATION ERROR:', error);

          this.errorMessage =
            'Erreur lors de la génération du QR Code';

          this.cdr.detectChanges();
        }

      },

      error: (error: any) => {

        this.errorMessage =
          error.error?.message ||
          'Erreur lors du chargement des tickets';

        console.error('LOAD TICKETS ERROR:', error);

        this.cdr.detectChanges();
      }

    });

  }

  // LIVE COUNTDOWN

  updateCountdowns(): void {

    for (const ticket of this.tickets) {

      if (!ticket.start_date) {
        continue;
      }

      const eventTime = new Date(ticket.start_date).getTime();
      const now = Date.now();

      if (Number.isNaN(eventTime)) {
        continue;
      }

      const difference = eventTime - now;

      if (difference <= 0) {
        this.countdowns[ticket.id] = 'Event started';
        continue;
      }

      const days = Math.floor(
        difference / (1000 * 60 * 60 * 24)
      );

      const hours = Math.floor(
        (difference / (1000 * 60 * 60)) % 24
      );

      const minutes = Math.floor(
        (difference / (1000 * 60)) % 60
      );

      const seconds = Math.floor(
        (difference / 1000) % 60
      );

      this.countdowns[ticket.id] =
        `${days}d : ${hours}h : ${minutes}m : ${seconds}s`;

    }

    this.cdr.detectChanges();
  }

  // BOOK TICKET

  bookTicket(): void {

    if (!this.eventId) {
      this.errorMessage = 'Entrez le numéro de l’événement';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.message = '';

    this.ticketService.bookTicket(
      this.userId,
      this.eventId
    ).subscribe({

      next: (data: any) => {

        console.log('BOOKING SUCCESS:', data);

        this.message = 'Réservation effectuée avec succès';

        this.loading = false;
        this.eventId = null;

        this.loadTickets();

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        this.errorMessage =
          error.error?.message ||
          'Erreur lors de la réservation';

        this.loading = false;

        console.error('BOOKING ERROR:', error);

        this.cdr.detectChanges();
      }

    });

  }

  // CANCEL TICKET

  cancelTicket(ticketId: number): void {

    this.ticketService.cancelTicket(ticketId).subscribe({

      next: (data: any) => {

        console.log('CANCEL SUCCESS:', data);

        this.message = 'Ticket annulé avec succès';
        this.errorMessage = '';

        this.loadTickets();

        this.cdr.detectChanges();
      },

      error: (error: any) => {

        this.errorMessage =
          error.error?.message ||
          'Erreur lors de l’annulation';

        console.error('CANCEL ERROR:', error);

        this.cdr.detectChanges();
      }

    });

  }

}
