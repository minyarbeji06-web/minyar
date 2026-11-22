
import { Routes } from '@angular/router';
import { Tickets } from './app/tickets/tickets';
import { TicketVerification } from './ticket-verification/ticket-verification';

export const routes: Routes = [
  {
    path: '',
    component: Tickets
  },
  {
    path: 'verify-ticket/:code',
    component: TicketVerification
  }
];
