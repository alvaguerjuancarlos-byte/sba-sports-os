// Espejo de src/player-card/player-card.types.ts (backend).
export type AthleteMedicalNoteType = 'condition' | 'allergy' | 'restriction' | 'injury';

export interface AthleteMedicalNote {
  id: string;
  organization_id: string;
  player_id: string;
  note_type: AthleteMedicalNoteType;
  description: string;
  recorded_by: string;
  recorded_at: string;
  active: boolean;
}

export interface AthleteNutritionNote {
  id: string;
  organization_id: string;
  player_id: string;
  note: string;
  recorded_by: string;
  recorded_at: string;
}

export type MediaConsentStatus = 'requested' | 'granted' | 'revoked';

export interface MediaConsent {
  id: string;
  organization_id: string;
  user_id: string;
  consent_status: MediaConsentStatus;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GalleryAssetScope = 'athlete' | 'team';
export type GalleryAssetType = 'photo' | 'video';

export interface GalleryAsset {
  id: string;
  organization_id: string;
  scope: GalleryAssetScope;
  scope_ref_id: string;
  asset_url: string;
  asset_type: GalleryAssetType;
  uploaded_by: string;
  uploaded_at: string;
  active: boolean;
}

export interface SeccionPlayerCard<T> {
  restricted: boolean;
  data: T | null;
}

export interface PlayerCardResultado {
  administrativo: SeccionPlayerCard<{ user: { id: string; full_name: string; email: string | null; phone: string | null; date_of_birth: string }; roles: { role: string; status: string }[] }>;
  deportivo: SeccionPlayerCard<{ teams: ({ id: string; name: string; category: string; sport: string } | null)[] }>;
  performance: SeccionPlayerCard<{
    assessments: { id: string; assessment_date: string; category: string; score: string; notes: string | null }[];
    matchStatistics: { id: string; minutes_played: number; goals: number; cards: number }[];
    developmentMap: { dimensions: Record<string, { value: number | null; sufficientData: boolean }> } | null;
  }>;
  asistencia: SeccionPlayerCard<{ checkins: { id: string; method: string; checked_in_at: string }[] }>;
  calendario: SeccionPlayerCard<{ events: { id: string; type: string; start_at: string }[] }>;
  pagos: SeccionPlayerCard<{ saldoActual: number }>;
  medico: SeccionPlayerCard<{ notes: AthleteMedicalNote[] }>;
  nutricion: SeccionPlayerCard<{ notes: AthleteNutritionNote[] }>;
  galeria: SeccionPlayerCard<{ assets: GalleryAsset[] }>;
}
