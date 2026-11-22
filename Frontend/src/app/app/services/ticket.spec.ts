
import { TestBed } from '@angular/core/testing';
import { TicketService } from './ticket';

describe('TicketService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    const service = TestBed.inject(TicketService);
    expect(service).toBeTruthy();
  });
});


