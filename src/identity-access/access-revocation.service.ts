import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { UserTenantRoleRow } from './identity-access.types.js';

export interface RevocarAccesoInput {
  organizationId: string;
  actorUserId: string;
  userTenantRoleId: string;
}

// UC-ID-05 — Revocación de acceso / remoción de usuario (condensado).
//
// Alcance real de este servicio: cierra el acceso en la base de datos (status = revoked). La
// revocación de tokens/sesiones activas del lado del proveedor de identidad (Auth0/Cognito) es
// responsabilidad de esa integración, todavía no construida en este repo (ver CLAUDE.md §Stack)
// — llamarla desde aquí en cuanto exista un AuthProviderAdapter, no antes.
@Injectable()
export class AccessRevocationService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async revocarAcceso(input: RevocarAccesoInput): Promise<UserTenantRoleRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<UserTenantRoleRow>(
        `select * from user_tenant_role where id = $1`,
        [input.userTenantRoleId],
      );
      const rolActual = rows[0];
      if (!rolActual) throw new NotFoundException('user_tenant_role no encontrado.');

      // Nunca borra la fila ni el user global — "preserva el user global si la persona mantiene
      // roles en otros tenants o los recupera después; nunca se borra el historial transaccional
      // asociado (facturas, asistencia, evaluaciones), solo se cierra el acceso."
      const { rows: updated } = await client.query<UserTenantRoleRow>(
        `update user_tenant_role set status = 'revoked' where id = $1 returning *`,
        [input.userTenantRoleId],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'user_tenant_role',
        entityId: rolActual.id,
        fieldChanged: 'status',
        oldValue: { status: rolActual.status },
        newValue: { status: 'revoked' },
      });

      return updated[0];
    });
  }
}
