// Tipos de fila — reflejan db/migrations/0007_attendance_realtime_init.sql.

export type BiometricConsentStatus = 'granted' | 'revoked';
export type CheckinMethod = 'facial' | 'manual_fallback';

export interface BiometricConsentRow {
  id: string;
  organization_id: string;
  user_id: string;
  consent_status: BiometricConsentStatus;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BiometricTemplateRow {
  id: string;
  organization_id: string;
  user_id: string;
  provider_ref: string;
  created_at: string;
}

export interface CheckinEventRow {
  id: string;
  organization_id: string;
  event_id: string;
  user_id: string;
  method: CheckinMethod;
  confirmed_by: string | null;
  flagged_for_review: boolean;
  checked_in_at: string;
  created_at: string;
}
