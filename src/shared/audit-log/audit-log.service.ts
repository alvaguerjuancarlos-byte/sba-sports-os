import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';

// Transversal — no exclusiva de Identity & Access (diccionario-datos-fase2.md). Cualquier
// dominio que modifique un dato sensible o financiero debe llamar record() dentro de la MISMA
// transacción/withTenant() que hizo el cambio — "todo cambio a un dato sensible o financiero
// genera entrada en audit_log, sin excepciones" (CLAUDE.md, principio no negociable).
export interface RegistrarAuditoriaInput {
  organizationId: string;
  actorUserId: string;
  entityType: string;
  entityId: string;
  fieldChanged?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}

@Injectable()
export class AuditLogService {
  // Recibe el `client` de la transacción en curso (de DatabaseService.withTenant) — nunca abre
  // su propia conexión/transacción, para que la entrada de audit_log sea atómica con el cambio
  // que audita (si el cambio hace rollback, la entrada de auditoría también).
  async record(client: PoolClient, input: RegistrarAuditoriaInput): Promise<void> {
    await client.query(
      `insert into audit_log
        (organization_id, actor_user_id, entity_type, entity_id, field_changed, old_value, new_value)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.organizationId,
        input.actorUserId,
        input.entityType,
        input.entityId,
        input.fieldChanged ?? null,
        input.oldValue != null ? JSON.stringify(input.oldValue) : null,
        input.newValue != null ? JSON.stringify(input.newValue) : null,
      ],
    );
  }
}
