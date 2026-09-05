// Espejo de src/match-center/match-center.types.ts (backend).
export type MatchScoreStatus = 'live' | 'final';
export type MatchEventType = 'goal' | 'substitution' | 'card';
export type MatchCardColor = 'yellow' | 'red';

export interface MatchScore {
  id: string;
  organization_id: string;
  event_id: string;
  team_score: number;
  opponent_score: number;
  status: MatchScoreStatus;
  created_at: string;
  updated_at: string;
}

export interface MatchLineup {
  id: string;
  organization_id: string;
  event_id: string;
  callup_slot_id: string;
  user_id: string;
  position: string;
  formation_slot: string;
  is_starter: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchEvent {
  id: string;
  organization_id: string;
  event_id: string;
  type: MatchEventType;
  minute: number;
  player_lineup_id: string;
  substitute_lineup_id: string | null;
  card_color: MatchCardColor | null;
  pushed_at: string;
  created_at: string;
}

export interface PlayerStatistic {
  id: string;
  organization_id: string;
  event_id: string;
  user_id: string;
  minutes_played: number;
  goals: number;
  cards: number;
  created_at: string;
  updated_at: string;
}

export interface ConsultarEnVivoResultado {
  matchScore: MatchScore;
  eventos: MatchEvent[];
}
