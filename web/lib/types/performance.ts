// Espejo de src/performance/performance.types.ts (backend).
export type DevelopmentMapScope = 'athlete' | 'team' | 'academy';

export interface PerformanceAssessment {
  id: string;
  organization_id: string;
  player_id: string;
  coach_id: string;
  assessment_date: string;
  category: string;
  score: string;
  notes: string | null;
  created_at: string;
}

export interface DevelopmentDimension {
  value: number | null;
  sufficientData: boolean;
  excludedCount?: number;
}

export interface DevelopmentDimensions {
  desempeño: DevelopmentDimension;
  rendimientoEnPartido: DevelopmentDimension;
  actitudSemanal: DevelopmentDimension;
  asistencia: DevelopmentDimension;
}

export interface AiSuggestionPayload {
  recommendation: string;
  variables: Record<string, number>;
  generatedAt: string;
}

export interface DevelopmentMap {
  id: string;
  organization_id: string;
  scope: DevelopmentMapScope;
  scope_ref_id: string;
  date_range_start: string;
  date_range_end: string;
  dimensions: DevelopmentDimensions;
  ai_suggestion: AiSuggestionPayload | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
}
