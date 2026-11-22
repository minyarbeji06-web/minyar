
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import {
  TicketService,
  TicketVerification as VerificationResult
} from '../app/services/ticket.service';

@Component({
  selector: 'app-ticket-verification',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './ticket-verification.html',
  styleUrl: './ticket-verification.css'
})
export class TicketVerification implements OnInit {

  verification: VerificationResult | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private ticketService: TicketService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code');

    if (!code) {
      this.loading = false;
      this.errorMessage = 'Ticket code is missing';
      this.cdr.detectChanges();
      return;
    }

    this.ticketService.verifyTicket(code).subscribe({

      next: (result: VerificationResult) => {
        console.log('VERIFICATION RESULT:', result);

        this.verification = result;
        this.loading = false;

        this.cdr.detectChanges();
      },

      error: (error: any) => {
        console.error('VERIFICATION ERROR:', error);

        this.loading = false;

        if (error.status === 404) {
          this.verification = {
            valid: false,
            message: 'Ticket not found'
          };
        } else {
          this.errorMessage = 'Unable to verify ticket. Please try again.';
        }

        this.cdr.detectChanges();
      }

    });
  }
}
