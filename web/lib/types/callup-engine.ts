// Espejo de src/callup-engine/callup-engine.types.ts (backend).
export type CallupSlotStatus = 'called' | 'alternate' | 'accepted' | 'declined' | 'excluded';
export type CallupFormatRuleStatus = 'active' | 'archived';
export type CallupWaiverAction = 'exclude' | 'include';

export interface CallupFormatRule {
  id: string;
  organization_id: string;
  sport: string;
  format: string;
  max_players: number;
  priority_window_days: number;
  status: CallupFormatRuleStatus;
  created_at: string;
  updated_at: string;
}

export interface CallupList {
  id: string;
  organization_id: string;
  event_id: string;
  callup_format_rule_id: string;
  created_at: string;
  updated_at: string;
}

export interface CallupWaiver {
  id: string;
  organization_id: string;
  callup_slot_id: string;
  waived_by: string;
  action: CallupWaiverAction;
  internal_comment?: string;
  created_at: string;
}

export interface CallupSlot {
  id: string;
  organization_id: string;
  callup_list_id: string;
  user_id: string;
  status: CallupSlotStatus;
  priority_score: string | null;
  responded_at: string | null;
  responded_by: string | null;
  created_at: string;
  updated_at: string;
  waivers: CallupWaiver[];
}

export interface ConsultarConvocatoriaResultado {
  callupList: CallupList;
  slots: CallupSlot[];
}
