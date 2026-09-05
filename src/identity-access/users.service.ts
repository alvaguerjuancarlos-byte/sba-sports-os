import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { calcularEsMenorDeEdad, type TenantRole, type UserRow, type UserTenantRoleRow } from './identity-access.types.js';

export interface AltaUsuarioInput {
  organizationId: string;
  actorUserId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  dateOfBirth: Date;
  role: TenantRole;
  // Requerido cuando role='player' y la persona es menor de edad (UC-ID-01 paso 5 → UC-ID-03).
  guardianUserId?: string | null;
}

export interface AltaUsuarioResultado {
  user: UserRow;
  userTenantRole: UserTenantRoleRow;
  esMenorDeEdad: boolean;
  requiereConsentimientoTutor: boolean;
  guardianLinkId: string | null;
}

export interface AsignarRolAdicionalInput {
  organizationId: string;
  actorUserId: string;
  userId: string;
  role: TenantRole;
  guardianUserId?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  // UC-ID-01 — Alta de usuario con rol inicial.
  async altaUsuarioConRolInicial(input: AltaUsuarioInput): Promise<AltaUsuarioResultado> {
    // 2a. "Fecha de nacimiento no capturada → el sistema bloquea el alta; es un campo
    // obligatorio, no opcional" — el tipo TS ya la exige, esta es la defensa en el límite de la
    // API (un body JSON puede llegar sin el campo pese al tipo de TS).
    if (!input.dateOfBirth) {
      throw new BadRequestException('date_of_birth es obligatorio (RFP §6) — no se puede dar de alta sin ella.');
    }
    if (!input.email && !input.phone) {
      throw new BadRequestException('Se requiere al menos email o teléfono.');
    }

    const esMenorDeEdad = calcularEsMenorDeEdad(input.dateOfBirth);
    // UC-ID-01 paso 5: solo el rol player deriva al flujo de consentimiento de tutor — otros
    // roles (coach/admin/parent/director) no lo requieren aunque la persona sea menor, tal como
    // está escrito literal en el caso de uso (no se generaliza más allá de lo documentado).
    const requiereConsentimientoTutor = input.role === 'player' && esMenorDeEdad;
    if (requiereConsentimientoTutor && !input.guardianUserId) {
      throw new BadRequestException(
        'Un player menor de edad requiere guardianUserId para iniciar el consentimiento de tutor (UC-ID-03).',
      );
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      // 4a. "Ya existe un user con ese email/teléfono → el sistema reutiliza el user global y
      // solo crea un nuevo user_tenant_role, sin duplicar identidad" (arquitectura §3.4).
      const user = await this.buscarOCrearUsuarioGlobal(client, {
        fullName: input.fullName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        dateOfBirth: input.dateOfBirth,
      });

      const status = requiereConsentimientoTutor ? 'pending' : 'active';
      const { rows: rolRows } = await client.query<UserTenantRoleRow>(
        `insert into user_tenant_role (organization_id, user_id, role, status)
         values ($1, $2, $3, $4)
         returning *`,
        [input.organizationId, user.id, input.role, status],
      );
      const userTenantRole = rolRows[0];

      let guardianLinkId: string | null = null;
      if (requiereConsentimientoTutor) {
        // UC-ID-03 paso 2: "El sistema crea guardian_link con consent_status = requested".
        const { rows: guardianRows } = await client.query<{ id: string }>(
          `insert into guardian_link (organization_id, guardian_user_id, athlete_user_id, consent_status)
           values ($1, $2, $3, 'requested')
           returning id`,
          [input.organizationId, input.guardianUserId, user.id],
        );
        guardianLinkId = guardianRows[0].id;
      }

      // Criterio de aceptación UC-ID-01: "El alta queda registrada en audit_log con actor,
      // timestamp y valores capturados."
      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'user_tenant_role',
        entityId: userTenantRole.id,
        newValue: { userId: user.id, role: input.role, status, guardianLinkId },
      });

      return { user, userTenantRole, esMenorDeEdad, requiereConsentimientoTutor, guardianLinkId };
    });
  }

  // UC-ID-02 — Asignar rol adicional a usuario existente.
  async asignarRolAdicional(input: AsignarRolAdicionalInput): Promise<UserTenantRoleRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      // 1a. "Búsqueda no encuentra al user → se redirige a UC-ID-01 (alta nueva), no se fuerza
      // una coincidencia incierta" — este servicio nunca crea un user aquí, solo falla claro.
      const { rows: userRows } = await client.query<UserRow>(`select * from "user" where id = $1`, [input.userId]);
      const user = userRows[0];
      if (!user) {
        throw new NotFoundException(
          `No existe un user con id ${input.userId} — usar altaUsuarioConRolInicial (UC-ID-01), no se crea aquí.`,
        );
      }

      const esMenorDeEdad = calcularEsMenorDeEdad(new Date(user.date_of_birth));
      const requiereConsentimientoTutor = input.role === 'player' && esMenorDeEdad;
      if (requiereConsentimientoTutor && !input.guardianUserId) {
        throw new BadRequestException(
          'Un player menor de edad requiere guardianUserId para iniciar el consentimiento de tutor (UC-ID-03).',
        );
      }
      const status = requiereConsentimientoTutor ? 'pending' : 'active';

      let userTenantRole: UserTenantRoleRow;
      try {
        const { rows } = await client.query<UserTenantRoleRow>(
          `insert into user_tenant_role (organization_id, user_id, role, status)
           values ($1, $2, $3, $4)
           returning *`,
          [input.organizationId, user.id, input.role, status],
        );
        userTenantRole = rows[0];
      } catch (e) {
        // Constraint unique(organization_id, user_id, role) — "agregar un rol nunca crea un
        // segundo user_tenant_role idéntico" (principio de no duplicar dato, CLAUDE.md).
        if (this.esViolacionDeUnicidad(e)) {
          throw new ConflictException('Este usuario ya tiene ese rol en esta organización.');
        }
        throw e;
      }

      if (requiereConsentimientoTutor) {
        await client.query(
          `insert into guardian_link (organization_id, guardian_user_id, athlete_user_id, consent_status)
           values ($1, $2, $3, 'requested')`,
          [input.organizationId, input.guardianUserId, user.id],
        );
      }

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'user_tenant_role',
        entityId: userTenantRole.id,
        newValue: { userId: user.id, role: input.role, status },
      });

      return userTenantRole;
    });
  }

  private async buscarOCrearUsuarioGlobal(
    client: PoolClient,
    datos: { fullName: string; email: string | null; phone: string | null; dateOfBirth: Date },
  ): Promise<UserRow> {
    if (datos.email || datos.phone) {
      const { rows } = await client.query<UserRow>(
        `select * from "user" where ($1::text is not null and email = $1) or ($2::text is not null and phone = $2)`,
        [datos.email, datos.phone],
      );
      if (rows[0]) return rows[0];
    }
    const { rows } = await client.query<UserRow>(
      `insert into "user" (full_name, email, phone, date_of_birth)
       values ($1, $2, $3, $4)
       returning *`,
      [datos.fullName, datos.email, datos.phone, datos.dateOfBirth],
    );
    return rows[0];
  }

  private esViolacionDeUnicidad(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
  }

  // Lectura para consumidores de otros dominios (ej. Sports Hub, UC-SPT-03: "ningún
  // roster_membership existe sin un user_tenant_role activo asociado") — así ese dominio nunca
  // hace SELECT directo contra user_tenant_role, siempre vía este servicio.
  async tieneRolActivoEnOrganizacion(organizationId: string, userId: string): Promise<boolean> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query(
        `select 1 from user_tenant_role where user_id = $1 and status = 'active' limit 1`,
        [userId],
      );
      return rows.length > 0;
    });
  }
}
