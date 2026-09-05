// Tipos de fila — reflejan db/migrations/0006_calendar_rsvp_init.sql.

export type VenueStatus = 'active' | 'archived';
export type EventType = 'match' | 'training' | 'tournament';
export type EventStatus = 'scheduled';
export type RsvpStatus = 'pending' | 'confirmed' | 'declined';

export interface VenueRow {
  id: string;
  organization_id: string;
  name: string;
  status: VenueStatus;
  created_at: string;
  updated_at: string;
}

export interface EventRow {
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
}

export interface AttendanceRow {
  id: string;
  organization_id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

// UC-CAL-02, flujo 3 + alt 3a: "quien programa no tiene permiso de excepción → la opción de forzar
// el traslape ni siquiera se muestra." [propuesto]: mismo criterio ya usado para la escalación de
// excepciones en Admin Hub (UC-ADM-03) — admin/director tienen el permiso, coach no.
export function tienePermisoDeExcepcion(roles: string[]): boolean {
  return roles.includes('admin') || roles.includes('director');
}
