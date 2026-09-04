import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { GuardianLinkRow } from './identity-access.types.js';

export interface OtorgarConsentimientoInput {
  organizationId: string;
  actorUserId: string; // el tutor otorgando, o un admin supervisando el flujo
  guardianLinkId: string;
  privacyNoticeVersion: string; // "qué aviso de privacidad exacto se mostró" — auditable
}

export interface NegarConsentimientoInput {
  organizationId: string;
  actorUserId: string;
  guardianLinkId: string;
}

// UC-ID-03 — Consentimiento de tutor y activación de cuenta de menor.
@Injectable()
export class GuardianConsentService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async otorgarConsentimiento(input: OtorgarConsentimientoInput): Promise<GuardianLinkRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<GuardianLinkRow>(
        `select * from guardian_link where id = $1`,
        [input.guardianLinkId],
      );
      const link = rows[0];
      if (!link) throw new NotFoundException('guardian_link no encontrado.');
      // El registro de consentimiento es inmutable una vez capturado (criterio de aceptación
      // UC-ID-03) — solo se permite la transición requested -> granted, nunca re-otorgar.
      if (link.consent_status !== 'requested') {
        throw new ConflictException(
          `guardian_link ya está en estado '${link.consent_status}' — el consentimiento es inmutable una vez capturado.`,
        );
      }

      const { rows: updated } = await client.query<GuardianLinkRow>(
        `update guardian_link
         set consent_status = 'granted', consent_captured_at = now(), privacy_notice_version = $2
         where id = $1
         returning *`,
        [input.guardianLinkId, input.privacyNoticeVersion],
      );
      const linkActualizado = updated[0];

      // "El sistema activa user_tenant_role.status = active para el menor" (UC-ID-03 paso 4) —
      // activa la fila player de este atleta que quedó pending esperando este consentimiento.
      await client.query(
        `update user_tenant_role
         set status = 'active'
         where organization_id = $1 and user_id = $2 and role = 'player' and status = 'pending'`,
        [input.organizationId, link.athlete_user_id],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'guardian_link',
        entityId: link.id,
        fieldChanged: 'consent_status',
        oldValue: { consent_status: 'requested' },
        newValue: { consent_status: 'granted' },
      });

      return linkActualizado;
    });
  }

  async negarConsentimiento(input: NegarConsentimientoInput): Promise<GuardianLinkRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<GuardianLinkRow>(
        `select * from guardian_link where id = $1`,
        [input.guardianLinkId],
      );
      const link = rows[0];
      if (!link) throw new NotFoundException('guardian_link no encontrado.');
      if (link.consent_status !== 'requested') {
        throw new ConflictException(`guardian_link ya está en estado '${link.consent_status}'.`);
      }

      // "Si niega: la cuenta permanece en pending indefinidamente — no hay activación parcial."
      // No se toca user_tenant_role (ya está pending) — solo se cierra el consent_status.
      const { rows: updated } = await client.query<GuardianLinkRow>(
        `update guardian_link set consent_status = 'revoked' where id = $1 returning *`,
        [input.guardianLinkId],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'guardian_link',
        entityId: link.id,
        fieldChanged: 'consent_status',
        oldValue: { consent_status: 'requested' },
        newValue: { consent_status: 'revoked' },
      });

      return updated[0];
    });
  }
}
