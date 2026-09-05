// Tipos de fila — reflejan db/migrations/0010_match_center_init.sql.

export type MatchScoreStatus = 'live' | 'final';
export type MatchEventType = 'goal' | 'substitution' | 'card';
export type MatchCardColor = 'yellow' | 'red';

export interface MatchScoreRow {
  id: string;
  organization_id: string;
  event_id: string;
  team_score: number;
  opponent_score: number;
  status: MatchScoreStatus;
  created_at: string;
  updated_at: string;
}

export interface MatchLineupRow {
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

export interface MatchEventRow {
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

export interface PlayerStatisticRow {
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

// UC-MAT-03, paso 3: minutos jugados = (minuto de salida) - (minuto de entrada), sumado por
// jugador a través de todas sus filas de match_lineup en el partido (normalmente una sola, salvo
// que haya entrado, salido y vuelto a entrar). Titular entra en el minuto 0; quien nunca sale
// llega hasta finalMinute (input explícito del cierre, ver match-closing.service.ts).
export interface CalculoMinutosInput {
  lineup: Pick<MatchLineupRow, 'id' | 'user_id' | 'is_starter'>;
  minutoDeEntrada: number | null; // null si es titular (entra en 0) o no se encontró evento de sustitución de entrada
  minutoDeSalida: number | null; // null si sigue activo al cierre
  finalMinute: number;
}

export function calcularMinutosJugados(input: CalculoMinutosInput): number {
  const entrada = input.lineup.is_starter ? 0 : (input.minutoDeEntrada ?? 0);
  const salida = input.minutoDeSalida ?? input.finalMinute;
  return Math.max(0, salida - entrada);
}
