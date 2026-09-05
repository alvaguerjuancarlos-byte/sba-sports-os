import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { InvoiceRow, TransactionRow, TransactionStatus } from './payments-billing.types.js';

export interface RegistrarPagoInput {
  organizationId: string;
  actorUserId: string;
  invoiceId: string;
  providerTxnId: string;
  amount: string | number;
  feeAmount?: string | number | null;
  status: TransactionStatus;
}

export interface ReconciliarInput {
  organizationId: string;
  actorUserId: string;
  transactionId: string;
  estadoReportadoPorProveedor: TransactionStatus;
}

export interface ReconciliarResultado {
  transaction: TransactionRow;
  alertaGenerada: boolean;
}

// UC-PAY-03 — Procesar pago vía proveedor.
//
// No hay integración real con Stripe/Adyen (tokenización, checkout, webhooks firmados) — eso es
// una integración externa deferida, igual que Auth0/Cognito en Identity & Access. Este servicio
// modela el LADO que recibe el resultado de un cobro ya procesado por el proveedor (o un pago
// registrado manualmente por un admin), nunca captura datos de tarjeta — el tipo de entrada ni
// siquiera tiene un campo para ellos, por diseño (criterio de aceptación: "ningún campo de
// transaction contiene número de tarjeta o CVV — solo provider_txn_id").
@Injectable()
export class TransactionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async registrarPago(input: RegistrarPagoInput): Promise<TransactionRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: invoiceRows } = await client.query<InvoiceRow>(`select * from invoice where id = $1`, [
        input.invoiceId,
      ]);
      const invoice = invoiceRows[0];
      if (!invoice) throw new NotFoundException('invoice no encontrada.');

      const { rows } = await client.query<TransactionRow>(
        `insert into transaction (organization_id, invoice_id, provider_txn_id, amount, fee_amount, status)
         values ($1, $2, $3, $4, $5, $6)
         returning *`,
        [input.organizationId, input.invoiceId, input.providerTxnId, input.amount, input.feeAmount ?? null, input.status],
      );
      const transaction = rows[0];

      // Criterio de aceptación: "toda transaction con status = processed tiene una invoice
      // asociada actualizada en el mismo ciclo (o falla visible si no se pudo actualizar)" — misma
      // transacción de base de datos que el insert de arriba, por lo tanto atómico.
      if (input.status === 'processed') {
        await client.query(`update invoice set status = 'paid' where id = $1`, [input.invoiceId]);
      }

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'transaction',
        entityId: transaction.id,
        newValue: { invoiceId: input.invoiceId, providerTxnId: input.providerTxnId, amount: transaction.amount, status: transaction.status },
      });

      return transaction;
    });
  }

  // UC-PAY-03, paso 5 + alt-flow 5a: "el sistema reconcilia automáticamente contra el webhook del
  // proveedor — cualquier discrepancia... genera alerta, no se asume el estado local como verdad."
  // No se sobreescribe `status` en silencio: si difiere, solo se marca reconciliation_status =
  // discrepancy para revisión manual.
  async reconciliar(input: ReconciliarInput): Promise<ReconciliarResultado> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<TransactionRow>(`select * from transaction where id = $1`, [
        input.transactionId,
      ]);
      const transaction = rows[0];
      if (!transaction) throw new NotFoundException('transaction no encontrada.');

      const hayDiscrepancia = transaction.status !== input.estadoReportadoPorProveedor;
      const nuevoReconciliationStatus = hayDiscrepancia ? 'discrepancy' : 'ok';

      const { rows: updated } = await client.query<TransactionRow>(
        `update transaction set reconciliation_status = $2 where id = $1 returning *`,
        [input.transactionId, nuevoReconciliationStatus],
      );

      if (hayDiscrepancia) {
        await this.auditLog.record(client, {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          entityType: 'transaction',
          entityId: transaction.id,
          fieldChanged: 'reconciliation_status',
          oldValue: { status: transaction.status },
          newValue: { reconciliationStatus: 'discrepancy', estadoReportadoPorProveedor: input.estadoReportadoPorProveedor },
        });
      }

      return { transaction: updated[0], alertaGenerada: hayDiscrepancia };
    });
  }

  async listar(organizationId: string): Promise<TransactionRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<TransactionRow>(`select * from transaction order by created_at desc`);
      return rows;
    });
  }
}
