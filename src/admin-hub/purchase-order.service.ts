import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { CommitmentRow, PurchaseOrderRow, PurchaseRequestRow } from './admin-hub.types.js';

export interface EmitirPurchaseOrderInput {
  organizationId: string;
  actorUserId: string;
  purchaseRequestId: string;
  vendorId: string;
}

export interface EmitirPurchaseOrderResultado {
  purchaseOrder: PurchaseOrderRow;
  commitment: CommitmentRow;
}

// UC-ADM-04 — Emitir orden de compra (Purchase Order).
//
// [propuesto, diferido]: el alt-flow 1a (monto de la PO distinto del solicitado, con margen
// configurable y nueva ronda de aprobación si lo excede) depende de un mecanismo de configuración
// que no existe todavía — esta implementación usa siempre el monto de la purchase_request
// aprobada, sin permitir ajustarlo, hasta que ese mecanismo se construya.
@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async emitir(input: EmitirPurchaseOrderInput): Promise<EmitirPurchaseOrderResultado> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: prRows } = await client.query<PurchaseRequestRow>(`select * from purchase_request where id = $1`, [
        input.purchaseRequestId,
      ]);
      const solicitud = prRows[0];
      if (!solicitud) throw new NotFoundException('purchase_request no encontrado.');
      if (solicitud.status !== 'approved') {
        throw new ConflictException('Solo se puede emitir una orden de compra para una solicitud aprobada.');
      }

      let purchaseOrder: PurchaseOrderRow;
      try {
        const { rows } = await client.query<PurchaseOrderRow>(
          `insert into purchase_order (organization_id, purchase_request_id, vendor_id, amount)
           values ($1, $2, $3, $4)
           returning *`,
          [input.organizationId, input.purchaseRequestId, input.vendorId, solicitud.amount],
        );
        purchaseOrder = rows[0];
      } catch (e) {
        if (this.esViolacionDeFk(e)) throw new NotFoundException('El vendor indicado no existe (UC-ADM-04 requiere alta previa, UC-ADM-06).');
        if (this.esViolacionDeUnicidad(e)) throw new ConflictException('Esta purchase_request ya tiene una orden de compra emitida.');
        throw e;
      }

      // 3. "El sistema crea automáticamente un commitment asociado, ligado al mismo budget_line de
      // la solicitud original, con status = open." Criterio: "el commitment.amount coincide con el
      // monto de la PO al momento de creación."
      const { rows: commitmentRows } = await client.query<CommitmentRow>(
        `insert into commitment (organization_id, purchase_order_id, budget_line_id, amount, status)
         values ($1, $2, $3, $4, 'open')
         returning *`,
        [input.organizationId, purchaseOrder.id, solicitud.budget_line_id, purchaseOrder.amount],
      );
      const commitment = commitmentRows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'purchase_order',
        entityId: purchaseOrder.id,
        newValue: {
          purchaseRequestId: input.purchaseRequestId,
          vendorId: input.vendorId,
          amount: purchaseOrder.amount,
          commitmentId: commitment.id,
        },
      });

      return { purchaseOrder, commitment };
    });
  }

  // Lectura para el frontend — elegir una purchase_order al registrar un actual_posting
  // (UC-ADM-05) y ver el historial de órdenes emitidas.
  async listar(organizationId: string): Promise<PurchaseOrderRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<PurchaseOrderRow>(`select * from purchase_order order by created_at desc`);
      return rows;
    });
  }

  private esViolacionDeFk(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23503';
  }

  private esViolacionDeUnicidad(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
  }
}
