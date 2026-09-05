// Espejo de src/crm-enrollment/crm-enrollment.types.ts (backend).
export type ProspectStage = 'lead' | 'trial' | 'negotiation' | 'won' | 'lost';

export interface Prospect {
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

export interface TrialClassAttendance {
  id: string;
  organization_id: string;
  prospect_id: string;
  event_id: string;
  attended: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ConvertirProspectoResultado {
  prospect: Prospect;
  enrollment: { id: string; user_id: string; plan_id: string; enrolled_at: string };
  userId: string;
  esMenorDeEdad: boolean;
  guardianLinkId: string | null;
}
