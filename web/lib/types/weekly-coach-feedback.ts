// Espejo de src/weekly-coach-feedback/weekly-coach-feedback.types.ts (backend).
export type WeeklyFeedbackQuestionConfigStatus = 'active' | 'archived';

export interface WeeklyFeedbackQuestionConfig {
  id: string;
  organization_id: string;
  sport: string;
  question_1_label: string;
  question_2_label: string;
  question_3_label: string;
  status: WeeklyFeedbackQuestionConfigStatus;
  created_at: string;
}

export interface WeeklyFeedback {
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

export interface ResultadoEntradaLote {
  playerId: string;
  ok: boolean;
  feedback?: WeeklyFeedback;
  error?: string;
}
