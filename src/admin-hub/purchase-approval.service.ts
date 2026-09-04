import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { puedeAprobar, type PurchaseRequestRow } from './admin-hub.types.js';

export interface AprobarPurchaseRequestInput {
  organizationId: string;
  actorUserId: string;
  actorRoles: string[];
  purchaseRequestId: string;
}

export interface RechazarPurchaseRequestInput {
  organizationId: string;
  actorUserId: string;
  purchaseRequestId: string;
  rejectionReason: string;
}

// UC-ADM-03 — Aprobar/rechazar solicitud de compra.
@Injectable()
export class PurchaseApprovalService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async aprobar(input: AprobarPurchaseRequestInput): Promise<PurchaseRequestRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const solicitud = await this.buscarPendiente(client, input.purchaseRequestId);

      // 4a. "El aprobador de primer nivel intenta aprobar una solicitud marcada como excepción →
      // el sistema lo bloquea; el ruteo por umbral... es control de acceso aplicado server-side."
      if (!puedeAprobar(solicitud.routing, input.actorRoles)) {
        throw new ForbiddenException(
          'Esta solicitud es de excepción — requiere un aprobador de nivel escalado (director), no solo de primer nivel.',
        );
      }

      const { rows: updated } = await client.query<PurchaseRequestRow>(
        `update purchase_request set status = 'approved', approved_by = $2 where id = $1 returning *`,
        [input.purchaseRequestId, input.actorUserId],
      );

      // Criterio de aceptación: "la decisión (aprobar/rechazar, quién, cuándo) es inmutable y
      // auditable."
      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'purchase_request',
        entityId: solicitud.id,
        fieldChanged: 'status',
        oldValue: { status: 'pending' },
        newValue: { status: 'approved', approvedBy: input.actorUserId },
      });

      return updated[0];
    });
  }

  async rechazar(input: RechazarPurchaseRequestInput): Promise<PurchaseRequestRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      // "Todo rechazo requiere motivo capturado, visible al solicitante."
      if (!input.rejectionReason || input.rejectionReason.trim() === '') {
        throw new BadRequestException('Todo rechazo requiere un motivo capturado (UC-ADM-03).');
      }

      const solicitud = await this.buscarPendiente(client, input.purchaseRequestId);

      const { rows: updated } = await client.query<PurchaseRequestRow>(
        `update purchase_request set status = 'rejected', rejection_reason = $2 where id = $1 returning *`,
        [input.purchaseRequestId, input.rejectionReason],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'purchase_request',
        entityId: solicitud.id,
        fieldChanged: 'status',
        oldValue: { status: 'pending' },
        newValue: { status: 'rejected', rejectionReason: input.rejectionReason },
      });

      return updated[0];
    });
  }

  private async buscarPendiente(client: PoolClient, purchaseRequestId: string): Promise<PurchaseRequestRow> {
    const { rows } = await client.query<PurchaseRequestRow>(`select * from purchase_request where id = $1`, [
      purchaseRequestId,
    ]);
    const solicitud = rows[0];
    if (!solicitud) throw new NotFoundException('purchase_request no encontrado.');
    // "La decisión... es inmutable" — solo se puede decidir una vez, desde pending.
    if (solicitud.status !== 'pending') {
      throw new ConflictException(`Esta solicitud ya fue decidida (status actual: '${solicitud.status}') — la decisión es inmutable.`);
    }
    return solicitud;
  }
}
