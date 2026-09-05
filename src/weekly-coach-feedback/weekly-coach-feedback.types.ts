// Tipos de fila — reflejan db/migrations/0011_weekly_coach_feedback_init.sql.

export type WeeklyFeedbackQuestionConfigStatus = 'active' | 'archived';

export interface WeeklyFeedbackQuestionConfigRow {
  id: string;
  organization_id: string;
  sport: string;
  question_1_label: string;
  question_2_label: string;
  question_3_label: string;
  status: WeeklyFeedbackQuestionConfigStatus;
  created_at: string;
}

export interface WeeklyFeedbackRow {
  id: string;
  organization_id: string;
  team_id: string;
  player_id: string;
  coach_id: string;
  week_ending: string;
  mood: number | null;
  attention: number | null;
  attitude: number | null;
  disposition: number | null;
  commitment: number | null;
  dna: string | null;
  sport_question_1: string | null;
  sport_question_2: string | null;
  sport_question_3: string | null;
  note: string | null;
  voice_url: string | null;
  created_at: string;
  updated_at: string;
}

// UC-WCF-01, entrada de captura para un jugador dentro del lote — todos los campos de captura son
// opcionales, exactamente porque "ningún campo obligatorio de un jugador bloquea el guardado del
// resto del lote" (criterio de aceptación) implica que ninguno es en realidad obligatorio a nivel
// de dato, solo a nivel de UX (la pantalla anima a llenarlos, pero no bloquea el guardado).
export interface EntradaFeedbackJugador {
  playerId: string;
  mood?: number | null;
  attention?: number | null;
  attitude?: number | null;
  disposition?: number | null;
  commitment?: number | null;
  dna?: string | null;
  sportQuestion1?: string | null;
  sportQuestion2?: string | null;
  sportQuestion3?: string | null;
  note?: string | null;
  voiceUrl?: string | null;
}

export interface ResultadoEntradaLote {
  playerId: string;
  ok: boolean;
  feedback?: WeeklyFeedbackRow;
  error?: string;
}
