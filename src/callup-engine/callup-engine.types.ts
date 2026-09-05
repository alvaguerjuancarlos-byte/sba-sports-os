// Tipos de fila — reflejan db/migrations/0009_callup_engine_init.sql.

export type CallupSlotStatus = 'called' | 'alternate' | 'accepted' | 'declined' | 'excluded';
export type CallupFormatRuleStatus = 'active' | 'archived';
export type CallupWaiverAction = 'exclude' | 'include';

export interface CallupFormatRuleRow {
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

export interface CallupListRow {
  id: string;
  organization_id: string;
  event_id: string;
  callup_format_rule_id: string;
  created_at: string;
  updated_at: string;
}

export interface CallupSlotRow {
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
}

export interface CallupWaiverRow {
  id: string;
  organization_id: string;
  callup_slot_id: string;
  waived_by: string;
  action: CallupWaiverAction;
  internal_comment: string;
  created_at: string;
}

export type CallupWaiverRedactado = Omit<CallupWaiverRow, 'internal_comment'> & { internal_comment?: string };

// UC-CUP-04, criterio de aceptación: "el comentario nunca es visible fuera de roles admin,
// incluida cualquier exportación o vista de familia/jugador." [propuesto]: "roles admin" no
// especifica si incluye a director o solo admin — se usa el mismo criterio de scope elevado ya
// aplicado a becas (UC-PAY-04) y a la escalación de excepciones (UC-ADM-03): 'director' es el
// nivel con el scope, ni admin de primer nivel ni coach (aunque haya sido el coach quien escribió
// el comentario) lo ven por defecto.
export function tieneScopeDeWaiver(roles: string[]): boolean {
  return roles.includes('director');
}

export function redactarComentarioSiNoTieneScope(waiver: CallupWaiverRow, roles: string[]): CallupWaiverRedactado {
  if (tieneScopeDeWaiver(roles)) return waiver;
  const { internal_comment: _comentario, ...resto } = waiver;
  return resto;
}

// UC-CUP-03, criterio de aceptación: "dado el mismo conjunto de datos... el mismo orden — el
// cálculo es reproducible." Ordena por priority_score descendente; empate se resuelve por
// antigüedad en el equipo (rosterCreatedAt ascendente — el más antiguo gana), nunca al azar.
export interface CandidatoAlterno {
  userId: string;
  priorityScore: number;
  rosterCreatedAt: string;
}

export function ordenarAlternosPorPrioridad(candidatos: CandidatoAlterno[]): CandidatoAlterno[] {
  return [...candidatos].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return a.rosterCreatedAt < b.rosterCreatedAt ? -1 : a.rosterCreatedAt > b.rosterCreatedAt ? 1 : 0;
  });
}
