// Espejo de src/admin-hub/admin-hub.types.ts (backend).
export type AdminHubStatus = 'active' | 'archived';
export type PurchaseRequestStatus = 'pending' | 'approved' | 'rejected';
export type PurchaseRequestRouting = 'within_budget' | 'exception';
export type CommitmentStatus = 'open' | 'consumed';

export interface Vendor {
  id: string;
  organization_id: string;
  name: string;
  tax_id: string | null;
  status: AdminHubStatus;
  created_at: string;
  updated_at: string;
}

export interface BudgetLine {
  id: string;
  organization_id: string;
  financial_dimension_id: string;
  season: string;
  period: string;
  amount_budgeted: string;
  status: AdminHubStatus;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequest {
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

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  purchase_request_id: string;
  vendor_id: string;
  amount: string;
  created_at: string;
  updated_at: string;
}

export interface ActualPosting {
  id: string;
  organization_id: string;
  purchase_order_id: string;
  budget_line_id: string;
  amount: string;
  posted_at: string;
  created_at: string;
}

export interface BudgetVsActualRow {
  budget_line_id: string;
  financial_dimension_id: string;
  season: string;
  period: string;
  amount_budgeted: string;
  comprometido: string;
  gastado_real: string;
}
