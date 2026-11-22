
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Ticket {
  id: number;
  user_id: number;
  event_id: number;
  ticket_code: string;
  status: 'booked' | 'cancelled';
  booked_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  private apiUrl = 'http://localhost:3000/api/tickets';

  constructor(private http: HttpClient) {}

  getMyTickets(userId: number): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(
      `${this.apiUrl}/my-tickets?user_id=${userId}`
    );
  }

  bookTicket(userId: number, eventId: number): Observable<any> {
    return this.http.post(this.apiUrl, {
      user_id: userId,
      event_id: eventId
    });
  }

  cancelTicket(ticketId: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/${ticketId}/cancel`,
      {}
    );
  }
}
