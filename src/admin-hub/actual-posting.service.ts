import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { ActualPostingRow, CommitmentRow } from './admin-hub.types.js';

export interface RegistrarActualPostingInput {
  organizationId: string;
  actorUserId: string;
  purchaseOrderId: string;
  amount: string | number;
  postedAt?: Date | null;
}

export interface RegistrarActualPostingResultado {
  actualPosting: ActualPostingRow;
  commitment: CommitmentRow;
}

// UC-ADM-05 — Registrar posting real contra una orden de compra.
//
// [propuesto, diferido]: el alt-flow 1b (gasto directo sin purchase_order, permitido solo si la
// dimensión lo autoriza) depende de una bandera de configuración que no existe todavía en
// Configuration Studio — esta implementación solo cubre el flujo estándar (siempre contra una
// purchase_order con commitment abierto).
@Injectable()
export class ActualPostingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async registrar(input: RegistrarActualPostingInput): Promise<RegistrarActualPostingResultado> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: commitmentRows } = await client.query<CommitmentRow>(
        `select * from commitment where purchase_order_id = $1`,
        [input.purchaseOrderId],
      );
      const commitment = commitmentRows[0];
      if (!commitment) throw new NotFoundException('No existe un commitment para esa purchase_order.');
      // Criterio de aceptación: "nunca coexisten, para el mismo budget_line, un commitment.status
      // = open y un actual_posting que ya reconoció ese mismo gasto — la transición es atómica."
      if (commitment.status !== 'open') {
        throw new ConflictException(`El commitment ya está en estado '${commitment.status}' — no se puede registrar otro posting.`);
      }

      // 1a. "El monto real difiere del monto comprometido → el sistema registra el actual_posting
      // por el monto real y transiciona el commitment a consumed de todas formas; la diferencia
      // queda visible... no se oculta ni se fuerza a coincidir." No hay validación de igualdad con
      // commitment.amount, a propósito.
      const { rows: postingRows } = await client.query<ActualPostingRow>(
        `insert into actual_posting (organization_id, purchase_order_id, budget_line_id, amount, posted_at)
         values ($1, $2, $3, $4, coalesce($5, now()))
         returning *`,
        [input.organizationId, input.purchaseOrderId, commitment.budget_line_id, input.amount, input.postedAt ?? null],
      );
      const actualPosting = postingRows[0];

      // 2. "El sistema transiciona el commitment asociado de status = open a status = consumed" —
      // misma transacción que el insert de arriba, por lo tanto atómico.
      const { rows: commitmentUpdated } = await client.query<CommitmentRow>(
        `update commitment set status = 'consumed' where id = $1 returning *`,
        [commitment.id],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'actual_posting',
        entityId: actualPosting.id,
        newValue: { purchaseOrderId: input.purchaseOrderId, amount: actualPosting.amount, commitmentId: commitment.id },
      });

      return { actualPosting, commitment: commitmentUpdated[0] };
    });
  }

  // Lectura para el frontend — historial de postings reales.
  async listar(organizationId: string): Promise<ActualPostingRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<ActualPostingRow>(`select * from actual_posting order by posted_at desc`);
      return rows;
    });
  }
}
