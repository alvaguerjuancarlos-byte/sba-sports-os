// Espejo de src/calendar-rsvp/calendar-rsvp.types.ts (backend).
export type VenueStatus = 'active' | 'archived';
export type EventType = 'match' | 'training' | 'tournament';
export type EventStatus = 'scheduled';
export type RsvpStatus = 'pending' | 'confirmed' | 'declined';

export interface Venue {
  id: string;
  organization_id: string;
  name: string;
  status: VenueStatus;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDeHijo {
  attendanceId: string;
  athleteUserId: string;
  status: RsvpStatus;
}

export interface CalendarEvent {
  id: string;
  organization_id: string;
  type: EventType;
  team_id: string | null;
  league_cup_id: string | null;
  venue_id: string;
  start_at: string;
  end_at: string;
  status: EventStatus;
  created_at: string;
  updated_at: string;
  miRsvp: RsvpStatus | null;
  miAttendanceId: string | null;
  attendancesDeHijos?: AttendanceDeHijo[];
  confirmados?: number;
  declinados?: number;
  pendientes?: number;
}
