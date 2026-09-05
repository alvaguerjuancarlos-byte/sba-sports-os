import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { calcularRuteo, type BudgetLineRow, type PurchaseRequestRow } from './admin-hub.types.js';

export interface CrearPurchaseRequestInput {
  organizationId: string;
  actorUserId: string; // quien solicita (requested_by)
  budgetLineId: string;
  amount: string | number;
  justification?: string | null;
}

// UC-ADM-02 — Solicitar compra (Purchase Request).
@Injectable()
export class PurchaseRequestService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crear(input: CrearPurchaseRequestInput): Promise<PurchaseRequestRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: blRows } = await client.query<BudgetLineRow>(`select * from budget_line where id = $1`, [
        input.budgetLineId,
      ]);
      const budgetLine = blRows[0];
      if (!budgetLine) throw new NotFoundException('budget_line no encontrado.');
      // 1a. "El budget_line está archivado... el sistema rechaza la captura, no permite gasto
      // contra presupuesto inactivo."
      if (budgetLine.status === 'archived') {
        throw new BadRequestException('El budget_line está archivado — no se permite gasto contra presupuesto inactivo.');
      }

      const saldoDisponible = await this.calcularSaldoDisponible(client, budgetLine.id, budgetLine.amount_budgeted);
      const monto = Number(input.amount);
      const routing = calcularRuteo(monto, saldoDisponible);

      const { rows } = await client.query<PurchaseRequestRow>(
        `insert into purchase_request (organization_id, requested_by, budget_line_id, amount, justification, routing, status)
         values ($1, $2, $3, $4, $5, $6, 'pending')
         returning *`,
        [input.organizationId, input.actorUserId, input.budgetLineId, input.amount, input.justification ?? null, routing],
      );
      const purchaseRequest = rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'purchase_request',
        entityId: purchaseRequest.id,
        newValue: { budgetLineId: input.budgetLineId, amount: purchaseRequest.amount, routing },
      });

      return purchaseRequest;
    });
  }

  // UC-ADM-02 paso 2, criterio de aceptación: "el cálculo de saldo disponible siempre resta
  // commitments abiertos, no solo actual_postings — de lo contrario dos solicitudes simultáneas
  // podrían sobre-comprometer el mismo presupuesto."
  // Lectura para el frontend — sin esto no hay forma de ver qué solicitudes están pendientes de
  // aprobar (UC-ADM-03) ni un historial.
  async listar(organizationId: string, opciones: { status?: 'pending' | 'approved' | 'rejected' } = {}): Promise<PurchaseRequestRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      if (opciones.status) {
        const { rows } = await client.query<PurchaseRequestRow>(`select * from purchase_request where status = $1 order by created_at desc`, [opciones.status]);
        return rows;
      }
      const { rows } = await client.query<PurchaseRequestRow>(`select * from purchase_request order by created_at desc`);
      return rows;
    });
  }

  private async calcularSaldoDisponible(
    client: PoolClient,
    budgetLineId: string,
    amountBudgeted: string,
  ): Promise<number> {
    const { rows } = await client.query<{ comprometido: string; gastado_real: string }>(
      `select
         coalesce((select sum(amount) from commitment where budget_line_id = $1 and status = 'open'), 0) as comprometido,
         coalesce((select sum(amount) from actual_posting where budget_line_id = $1), 0) as gastado_real`,
      [budgetLineId],
    );
    const { comprometido, gastado_real: gastadoReal } = rows[0];
    return Number(amountBudgeted) - Number(comprometido) - Number(gastadoReal);
  }
}
