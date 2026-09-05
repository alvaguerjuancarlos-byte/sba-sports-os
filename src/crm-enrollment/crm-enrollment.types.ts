// Tipos de fila — reflejan db/migrations/0014_crm_enrollment_init.sql.

export type ProspectStage = 'lead' | 'trial' | 'negotiation' | 'won' | 'lost';

export interface ProspectRow {
  id: string;
  organization_id: string;
  name: string;
  contact_info: string;
  source: string;
  tags: string[];
  stage: ProspectStage;
  assigned_to: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrialClassAttendanceRow {
  id: string;
  organization_id: string;
  prospect_id: string;
  event_id: string;
  attended: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface EnrollmentRow {
  id: string;
  organization_id: string;
  prospect_id: string | null;
  user_id: string;
  plan_id: string;
  enrolled_at: string;
}
