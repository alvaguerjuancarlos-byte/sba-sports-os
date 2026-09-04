// Tipos de fila — reflejan db/migrations/0004_payments_billing_init.sql.

export type BillingCycle = 'monthly' | 'one_time';
export type MembershipPlanStatus = 'active' | 'cancelled';
export type InvoiceStatus = 'pending' | 'paid'; // 'overdue' nunca se almacena, ver calcularEstadoEfectivo
export type EffectiveInvoiceStatus = 'pending' | 'overdue' | 'paid';
export type TransactionStatus = 'processed' | 'failed';
export type ReconciliationStatus = 'ok' | 'discrepancy';

export interface MembershipPlanRow {
  id: string;
  organization_id: string;
  athlete_user_id: string;
  product_catalog_id: string;
  name: string;
  amount: string;
  currency: string;
  billing_cycle: BillingCycle;
  scholarship_flag: boolean;
  scholarship_amount: string | null;
  scholarship_pct: string | null;
  status: MembershipPlanStatus;
  created_at: string;
  updated_at: string;
}

export interface InvoiceRow {
  id: string;
  organization_id: string;
  athlete_user_id: string;
  membership_plan_id: string | null;
  product_catalog_id: string | null;
  financial_dimension_id: string | null;
  amount_due: string;
  due_date: string;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
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

export interface NotificationLogRow {
  id: string;
  organization_id: string;
  invoice_id: string | null;
  recipient_user_id: string;
  channel: string;
  sent_at: string;
}

// UC-PAY-02, criterio de aceptación: "el estado de la factura (pending/overdue/pagada) es siempre
// derivable de sus transactions asociadas, no un campo editado manualmente." `status` en la base de
// datos solo distingue pending/paid; 'overdue' se calcula aquí, nunca se escribe.
export function calcularEstadoEfectivo(status: InvoiceStatus, dueDate: string, ahora: Date = new Date()): EffectiveInvoiceStatus {
  if (status === 'paid') return 'paid';
  const hoy = ahora.toISOString().slice(0, 10);
  return dueDate < hoy ? 'overdue' : 'pending';
}

// UC-PAY-04, flujo 3: "las siguientes facturas generadas para ese plan reflejan el monto neto del
// descuento." Prioriza scholarship_amount (monto fijo) sobre scholarship_pct si ambos existen.
export function calcularMontoConBeca(montoBase: number, plan: Pick<MembershipPlanRow, 'scholarship_flag' | 'scholarship_amount' | 'scholarship_pct'>): number {
  if (!plan.scholarship_flag) return montoBase;
  if (plan.scholarship_amount != null) return Math.max(0, montoBase - Number(plan.scholarship_amount));
  if (plan.scholarship_pct != null) return Math.max(0, montoBase * (1 - Number(plan.scholarship_pct) / 100));
  return montoBase;
}

// UC-PAY-04, flujo alterno 2a + criterio de aceptación: "un usuario sin el scope de beca nunca ve
// el detalle de la beca en ninguna pantalla." [propuesto]: se usa el rol 'director' como el scope
// elevado (el documento fuente lo describe como un scope independiente del rol general de "admin
// financiero", que este modelo de roles todavía no tiene como concepto separado — mismo criterio
// ya aplicado a la escalación de excepciones en Admin Hub, UC-ADM-03).
export function tieneScopeDeBeca(roles: string[]): boolean {
  return roles.includes('director');
}

export type MembershipPlanRedactado = Omit<MembershipPlanRow, 'scholarship_flag' | 'scholarship_amount' | 'scholarship_pct'> & {
  scholarship_flag?: boolean;
  scholarship_amount?: string | null;
  scholarship_pct?: string | null;
};

export function redactarBecaSiNoTieneScope(plan: MembershipPlanRow, roles: string[]): MembershipPlanRedactado {
  if (tieneScopeDeBeca(roles)) return plan;
  const { scholarship_flag: _flag, scholarship_amount: _amount, scholarship_pct: _pct, ...resto } = plan;
  return resto;
}
