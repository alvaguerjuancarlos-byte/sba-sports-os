// Tipos de fila — reflejan db/migrations/0013_player_card_init.sql.

export type AthleteMedicalNoteType = 'condition' | 'allergy' | 'restriction' | 'injury';

export interface AthleteMedicalNoteRow {
  id: string;
  organization_id: string;
  player_id: string;
  note_type: AthleteMedicalNoteType;
  description: string;
  recorded_by: string;
  recorded_at: string;
  active: boolean;
}

export interface AthleteNutritionNoteRow {
  id: string;
  organization_id: string;
  player_id: string;
  note: string;
  recorded_by: string;
  recorded_at: string;
}

export type MediaConsentStatus = 'requested' | 'granted' | 'revoked';

export interface MediaConsentRow {
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

export interface GalleryAssetRow {
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

// UC-PLC-01, criterio de aceptación: "ninguna sección restringida se muestra a un solicitante sin
// el scope correspondiente — se muestra el estado 'restringido', nunca datos parciales ni un
// error genérico." Cada sección de la Player Card se envuelve en esta forma en vez de devolver el
// dato crudo o `undefined` en silencio.
export interface SeccionPlayerCard<T> {
  restricted: boolean;
  data: T | null;
}

export function seccionVisible<T>(data: T): SeccionPlayerCard<T> {
  return { restricted: false, data };
}

export function seccionRestringida<T>(): SeccionPlayerCard<T> {
  return { restricted: true, data: null };
}

// Roles con scope elevado — ven todas las secciones sin restricción, mismo criterio que "director"
// para becas/waivers en Payments/Call-up Engine, extendido aquí a admin también porque UC-PLC-01
// lista explícitamente a "Admin" (sin calificar) junto a coach/familia/tutor como actores con
// "algún nivel de acceso", y UC-PLC-02 lista a Admin como quien edita datos administrativos sin
// restricción adicional.
export function esStaffElevado(roles: string[]): boolean {
  return roles.includes('admin') || roles.includes('director');
}
