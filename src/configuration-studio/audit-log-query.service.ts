import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import type { AuditLogRow } from '../shared/audit-log/audit-log.service.js';

export interface ConsultarAuditLogInput {
  organizationId: string;
  entityType?: string;
  actorUserId?: string;
  from?: Date;
  to?: Date;
}

// UC-CFG-04 — Consultar log de auditoría de cambios. Solo lectura, filtrable por entidad, actor y
// rango de fecha — no hay flujo de edición (condensado en el documento fuente).
@Injectable()
export class AuditLogQueryService {
  constructor(private readonly db: DatabaseService) {}

  async consultar(input: ConsultarAuditLogInput): Promise<AuditLogRow[]> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const condiciones: string[] = [];
      const params: unknown[] = [];

      if (input.entityType) {
        params.push(input.entityType);
        condiciones.push(`entity_type = $${params.length}`);
      }
      if (input.actorUserId) {
        params.push(input.actorUserId);
        condiciones.push(`actor_user_id = $${params.length}`);
      }
      if (input.from) {
        params.push(input.from);
        condiciones.push(`occurred_at >= $${params.length}`);
      }
      if (input.to) {
        params.push(input.to);
        condiciones.push(`occurred_at <= $${params.length}`);
      }

      const whereClause = condiciones.length > 0 ? `where ${condiciones.join(' and ')}` : '';
      const { rows } = await client.query<AuditLogRow>(
        `select * from audit_log ${whereClause} order by occurred_at desc`,
        params,
      );
      return rows;
    });
  }
}
