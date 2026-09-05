// Tipos de fila — reflejan db/migrations/0005_sports_hub_init.sql.

export type SeasonStatus = 'active' | 'closed';
export type TeamStatus = 'active' | 'archived';
export type RosterRole = 'player' | 'coach';
export type RosterMembershipStatus = 'active' | 'inactive';

export interface SeasonRow {
  id: string;
  organization_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: SeasonStatus;
  created_at: string;
  updated_at: string;
}

export interface TeamRow {
  id: string;
  organization_id: string;
  season_id: string;
  name: string;
  category: string;
  sport: string;
  status: TeamStatus;
  created_at: string;
  updated_at: string;
}

export interface RosterMembershipRow {
  id: string;
  organization_id: string;
  team_id: string;
  user_id: string;
  role: RosterRole;
  jersey_number: number | null;
  position: string | null;
  status: RosterMembershipStatus;
  created_at: string;
  updated_at: string;
}

export interface LeagueCupRow {
  id: string;
  organization_id: string;
  season_id: string;
  name: string;
  format: string;
  rules: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface LeagueStandingRow {
  id: string;
  organization_id: string;
  league_cup_id: string;
  team_id: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  created_at: string;
  updated_at: string;
}

// UC-SPT-01: "no se solapan dos temporadas activas... sin confirmación explícita del admin (aviso,
// no bloqueo)". Ambos rangos son inclusivos (fechas 'YYYY-MM-DD').
export function rangosSeSolapan(inicioA: string, finA: string, inicioB: string, finB: string): boolean {
  return inicioA <= finB && inicioB <= finA;
}
