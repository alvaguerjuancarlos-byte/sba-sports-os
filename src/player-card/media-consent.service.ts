import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { UsersService } from '../identity-access/users.service.js';
import { GuardianConsentService } from '../identity-access/guardian-consent.service.js';
import { calcularEsMenorDeEdad } from '../identity-access/identity-access.types.js';
import type { MediaConsentRow } from './player-card.types.js';

export interface OtorgarMediaConsentInput {
  organizationId: string;
  actorUserId: string;
  userId: string;
}

export interface RevocarMediaConsentInput {
  organizationId: string;
  actorUserId: string;
  userId: string;
}

// UC-PLC-03, condensado — consentimiento de medios, distinto del biométrico (UC-ATT-05). Mismo
// patrón que BiometricConsentService (Attendance/Real-Time): un registro por usuario, otorgar y
// revocar terminan en el mismo estado final sobre esa fila, gateado por guardian_link si es menor.
@Injectable()
export class MediaConsentService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
    private readonly usersService: UsersService,
    private readonly guardianConsentService: GuardianConsentService,
  ) {}

  private async verificarAutorizacion(organizationId: string, actorUserId: string, userId: string): Promise<void> {
    const persona = await this.usersService.obtenerPorId(userId);
    if (!persona) throw new NotFoundException('El user indicado no existe.');

    const esMenor = calcularEsMenorDeEdad(new Date(persona.date_of_birth));
    if (esMenor) {
      const esGuardian = await this.guardianConsentService.esGuardianDe(organizationId, actorUserId, userId);
      if (!esGuardian) {
        throw new ForbiddenException('Solo un tutor con guardian_link puede gestionar el consentimiento de medios de un menor.');
      }
    } else if (actorUserId !== userId) {
      throw new ForbiddenException('Solo el propio usuario puede gestionar su consentimiento de medios.');
    }
  }

  async otorgar(input: OtorgarMediaConsentInput): Promise<MediaConsentRow> {
    await this.verificarAutorizacion(input.organizationId, input.actorUserId, input.userId);

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: existentes } = await client.query<MediaConsentRow>(`select * from media_consent where user_id = $1`, [input.userId]);

      const consent = existentes[0]
        ? (await client.query<MediaConsentRow>(`update media_consent set consent_status = 'granted', granted_at = now() where id = $1 returning *`, [existentes[0].id])).rows[0]
        : (
            await client.query<MediaConsentRow>(
              `insert into media_consent (organization_id, user_id, consent_status, granted_at) values ($1, $2, 'granted', now()) returning *`,
              [input.organizationId, input.userId],
            )
          ).rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'media_consent',
        entityId: consent.id,
        newValue: { userId: input.userId, consentStatus: 'granted' },
      });

      return consent;
    });
  }

  async revocar(input: RevocarMediaConsentInput): Promise<MediaConsentRow> {
    await this.verificarAutorizacion(input.organizationId, input.actorUserId, input.userId);

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: existentes } = await client.query<MediaConsentRow>(`select * from media_consent where user_id = $1`, [input.userId]);

      const consent = existentes[0]
        ? (await client.query<MediaConsentRow>(`update media_consent set consent_status = 'revoked', revoked_at = now() where id = $1 returning *`, [existentes[0].id])).rows[0]
        : (
            await client.query<MediaConsentRow>(
              `insert into media_consent (organization_id, user_id, consent_status, revoked_at) values ($1, $2, 'revoked', now()) returning *`,
              [input.organizationId, input.userId],
            )
          ).rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'media_consent',
        entityId: consent.id,
        newValue: { userId: input.userId, consentStatus: 'revoked' },
      });

      return consent;
    });
  }

  // Lectura para el frontend — saber si mostrar "otorgar" o "revocar" sin adivinar el estado.
  async obtenerEstado(organizationId: string, userId: string): Promise<MediaConsentRow | null> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<MediaConsentRow>(`select * from media_consent where user_id = $1`, [userId]);
      return rows[0] ?? null;
    });
  }

  // Lectura para GalleryService (UC-PLC-03): "requiere consentimiento de medios capturado
  // previamente" — nunca se infiere granted por ausencia de fila.
  async tieneConsentimientoVigente(organizationId: string, userId: string): Promise<boolean> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<MediaConsentRow>(`select * from media_consent where user_id = $1 and consent_status = 'granted'`, [userId]);
      return rows.length > 0;
    });
  }
}
