// Espejo de src/payments-billing/payments-billing.types.ts (backend).
export type BillingCycle = 'monthly' | 'one_time';
export type MembershipPlanStatus = 'active' | 'cancelled';
export type EffectiveInvoiceStatus = 'pending' | 'overdue' | 'paid';
export type TransactionStatus = 'processed' | 'failed';
export type ReconciliationStatus = 'ok' | 'discrepancy';

export interface MembershipPlan {
  id: string;
  organization_id: string;
  athlete_user_id: string;
  product_catalog_id: string;
  name: string;
  amount: string;
  currency: string;
  billing_cycle: BillingCycle;
  scholarship_flag?: boolean;
  scholarship_amount?: string | null;
  scholarship_pct?: string | null;
  status: MembershipPlanStatus;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  athlete_user_id: string;
  membership_plan_id: string | null;
  product_catalog_id: string | null;
  financial_dimension_id: string | null;
  amount_due: string;
  due_date: string;
  status: 'pending' | 'paid';
  effective_status: EffectiveInvoiceStatus;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  organization_id: string;
  invoice_id: string;
  provider_txn_id: string;
  amount: string;
  fee_amount: string | null;
  status: TransactionStatus;
  reconciliation_status: ReconciliationStatus;
  created_at: string;
}

export interface EligibilityResult {
  eligible: boolean;
  blockingInvoiceId?: string;
  paymentLink?: string;
}

export interface BalanceResult {
  saldoActual: number;
  invoices: Invoice[];
  transactions: Transaction[];
}
