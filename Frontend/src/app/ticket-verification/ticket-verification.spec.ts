
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  TicketService,
  TicketVerification as VerificationResult
} from '../services/ticket.service';

@Component({
  selector: 'app-ticket-verification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-verification.html',
  styleUrl: './ticket-verification.css'
})
export class TicketVerification implements OnInit {

  verification: VerificationResult | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private ticketService: TicketService
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code');

    if (!code) {
      this.loading = false;
      this.errorMessage = 'Ticket code is missing';
      return;
    }

    this.ticketService.verifyTicket(code).subscribe({

      next: (result) => {
        this.verification = result;
        this.loading = false;
      },

      error: (error) => {
        this.loading = false;

        if (error.status === 404) {
          this.verification = {
            valid: false,
            message: 'Ticket not found'
          };
        } else {
          this.errorMessage = 'Unable to verify ticket. Please try again.';
        }

        console.error('Verification error:', error);
      }

    });
  }
}
