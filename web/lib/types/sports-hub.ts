// Espejo de src/sports-hub/sports-hub.types.ts (backend).
export type SeasonStatus = 'active' | 'closed';
export type TeamStatus = 'active' | 'archived';
export type RosterRole = 'player' | 'coach';
export type RosterMembershipStatus = 'active' | 'inactive';

export interface Season {
  id: string;
  organization_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: SeasonStatus;
  created_at: string;
  updated_at: string;
}

export interface Team {
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

export interface RosterMembership {
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

export interface LeagueCup {
  id: string;
  organization_id: string;
  season_id: string;
  name: string;
  format: string;
  rules: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface LeagueStanding {
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
