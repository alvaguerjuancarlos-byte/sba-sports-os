// Tipos de fila — reflejan db/migrations/0003_admin_hub_init.sql.

export type AdminHubStatus = 'active' | 'archived';
export type PurchaseRequestStatus = 'pending' | 'approved' | 'rejected';
export type PurchaseRequestRouting = 'within_budget' | 'exception';
export type CommitmentStatus = 'open' | 'consumed';

export interface VendorRow {
  id: string;
  organization_id: string;
  name: string;
  tax_id: string | null;
  status: AdminHubStatus;
  created_at: string;
  updated_at: string;
}

export interface BudgetLineRow {
  id: string;
  organization_id: string;
  financial_dimension_id: string;
  season: string;
  period: string;
  amount_budgeted: string; // numeric de Postgres llega como string
  status: AdminHubStatus;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequestRow {
  id: string;
  organization_id: string;
  requested_by: string;
  budget_line_id: string;
  amount: string;
  justification: string | null;
  routing: PurchaseRequestRouting;
  status: PurchaseRequestStatus;
  approved_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderRow {
  id: string;
  organization_id: string;
  purchase_request_id: string;
  vendor_id: string;
  amount: string;
  created_at: string;
  updated_at: string;
}

export interface CommitmentRow {
  id: string;
  organization_id: string;
  purchase_order_id: string;
  budget_line_id: string;
  amount: string;
  status: CommitmentStatus;
  created_at: string;
  updated_at: string;
}

export interface ActualPostingRow {
  id: string;
  organization_id: string;
  purchase_order_id: string;
  budget_line_id: string;
  amount: string;
  posted_at: string;
  created_at: string;
}

// UC-ADM-02, pasos 2-4: "Si el monto solicitado cabe dentro del saldo disponible... 'dentro de
// presupuesto'. Si excede... 'excepción'."
export function calcularRuteo(amount: number, saldoDisponible: number): PurchaseRequestRouting {
  return amount <= saldoDisponible ? 'within_budget' : 'exception';
}

// UC-ADM-03, flujo 3 + alt 4a: "el ruteo por umbral no es una sugerencia, es control de acceso
// aplicado server-side" — una solicitud de excepción requiere un nivel de aprobación escalado.
// [propuesto]: el documento fuente deja el umbral/nivel de aprobador como "regla configurable"
// (Configuration Studio, RFP §5) que todavía no existe como tabla concreta — se usa 'director'
// como el nivel escalado ya existente en el modelo de roles (mismo criterio que UC-ID-04 aplica a
// MFA para roles financieros sensibles), no un valor inventado sin relación con el resto del
// sistema.
export function puedeAprobar(routing: PurchaseRequestRouting, roles: string[]): boolean {
  if (routing === 'exception') return roles.includes('director');
  return roles.includes('admin') || roles.includes('director');
}
