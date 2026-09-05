import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { UsersService } from '../identity-access/users.service.js';
import { GuardianConsentService } from '../identity-access/guardian-consent.service.js';
import { calcularEsMenorDeEdad } from '../identity-access/identity-access.types.js';
import type { BiometricConsentRow } from './attendance-realtime.types.js';

export interface OtorgarBiometricConsentInput {
  organizationId: string;
  actorUserId: string;
  userId: string;
}

export interface RevocarBiometricConsentInput {
  organizationId: string;
  actorUserId: string;
  userId: string;
}

export interface RegistrarTemplateInput {
  organizationId: string;
  actorUserId: string;
  userId: string;
  providerRef: string;
}

// UC-ATT-05 — Otorgar o revocar consentimiento biométrico. "Consentimiento específico y
// revocable... independiente del consentimiento general de cuenta" — nunca se infiere de
// guardian_link.consent_status (ese es otro flujo, UC-ID-03); guardian_link se usa aquí solo para
// saber quién es tutor de quién.
@Injectable()
export class BiometricConsentService {
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
        throw new ForbiddenException('Solo un tutor con guardian_link puede gestionar el consentimiento biométrico de un menor.');
      }
    } else if (actorUserId !== userId) {
      throw new ForbiddenException('Solo el propio usuario puede gestionar su consentimiento biométrico.');
    }
  }

  // Flujo 3: "si otorga, el sistema crea biometric_consent.consent_status = granted."
  async otorgar(input: OtorgarBiometricConsentInput): Promise<BiometricConsentRow> {
    await this.verificarAutorizacion(input.organizationId, input.actorUserId, input.userId);

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: existentes } = await client.query<BiometricConsentRow>(
        `select * from biometric_consent where user_id = $1`,
        [input.userId],
      );

      const consent = existentes[0]
        ? (
            await client.query<BiometricConsentRow>(
              `update biometric_consent set consent_status = 'granted', granted_at = now() where id = $1 returning *`,
              [existentes[0].id],
            )
          ).rows[0]
        : (
            await client.query<BiometricConsentRow>(
              `insert into biometric_consent (organization_id, user_id, consent_status, granted_at)
               values ($1, $2, 'granted', now())
               returning *`,
              [input.organizationId, input.userId],
            )
          ).rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'biometric_consent',
        entityId: consent.id,
        newValue: { userId: input.userId, consentStatus: 'granted' },
      });

      return consent;
    });
  }

  // Flujo alterno 4: cubre "niega" (primera vez) y "revoca" (deshacer un otorgamiento previo) —
  // ambos terminan en el mismo estado sobre el mismo registro, consent_status = revoked.
  async revocar(input: RevocarBiometricConsentInput): Promise<BiometricConsentRow> {
    await this.verificarAutorizacion(input.organizationId, input.actorUserId, input.userId);

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows: existentes } = await client.query<BiometricConsentRow>(
        `select * from biometric_consent where user_id = $1`,
        [input.userId],
      );

      const consent = existentes[0]
        ? (
            await client.query<BiometricConsentRow>(
              `update biometric_consent set consent_status = 'revoked', revoked_at = now() where id = $1 returning *`,
              [existentes[0].id],
            )
          ).rows[0]
        : (
            await client.query<BiometricConsentRow>(
              `insert into biometric_consent (organization_id, user_id, consent_status, revoked_at)
               values ($1, $2, 'revoked', now())
               returning *`,
              [input.organizationId, input.userId],
            )
          ).rows[0];

      // Criterio de aceptación: "ningún biometric_template sobrevive a un consent_status =
      // revoked" — excepción deliberada al principio de no-borrado del resto del sistema (ver
      // migración 0007). Misma transacción que el cambio de estado, por lo tanto atómico.
      await client.query(`delete from biometric_template where user_id = $1`, [input.userId]);

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'biometric_consent',
        entityId: consent.id,
        newValue: { userId: input.userId, consentStatus: 'revoked' },
      });

      return consent;
    });
  }

  // [propuesto] — sin caso de uso propio en el documento fuente (UC-ATT-01 asume el template ya
  // "almacenado" como precondición); esta es la acción mínima de enrolamiento, gateada por el
  // mismo consentimiento otorgado — no se puede enrolar sin haber consentido primero.
  async registrarTemplate(input: RegistrarTemplateInput): Promise<void> {
    await this.verificarAutorizacion(input.organizationId, input.actorUserId, input.userId);

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<BiometricConsentRow>(
        `select * from biometric_consent where user_id = $1 and consent_status = 'granted'`,
        [input.userId],
      );
      if (!rows[0]) {
        throw new BadRequestException('No se puede registrar un template biométrico sin consentimiento otorgado (UC-ATT-05).');
      }

      await client.query(`insert into biometric_template (organization_id, user_id, provider_ref) values ($1, $2, $3)`, [
        input.organizationId,
        input.userId,
        input.providerRef,
      ]);
    });
  }
}
