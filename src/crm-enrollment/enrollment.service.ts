import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { UsersService } from '../identity-access/users.service.js';
import { AccessRevocationService } from '../identity-access/access-revocation.service.js';
import { MembershipPlanService } from '../payments-billing/membership-plan.service.js';
import { ProspectService } from './prospect.service.js';
import type { BillingCycle } from '../payments-billing/payments-billing.types.js';
import type { EnrollmentRow, ProspectRow } from './crm-enrollment.types.js';

export interface ConvertirProspectoInput {
  organizationId: string;
  actorUserId: string;
  prospectId: string;
  dateOfBirth: string; // 'YYYY-MM-DD' — el prospect no captura DOB propia, se recaba al convertir
  email?: string | null;
  phone?: string | null;
  guardianUserId?: string | null; // requerido si el nuevo atleta es menor (UC-ID-01/03)
  productCatalogId: string;
  currency: string;
  billingCycle: BillingCycle;
}

export interface ConvertirProspectoResultado {
  prospect: ProspectRow;
  enrollment: EnrollmentRow;
  userId: string;
  esMenorDeEdad: boolean;
  guardianLinkId: string | null;
}

// UC-CRM-03 — Convertir prospecto en inscripción (one-click enrollment).
//
// "Transacción atómica" de 3 pasos que cruza 3 dominios (Identity & Access, Payments & Billing,
// este dominio) — ver nota de alcance completa en la migración 0014_crm_enrollment_init.sql.
// Aproximación real: el paso de identidad (UsersService.altaUsuarioConRolInicial) se ejecuta
// primero porque es el único de los tres que YA reutiliza identidad global sin duplicar (mismo
// principio "one person = one user" que el resto de la plataforma); si cualquier paso posterior
// falla, se compensa revocando el user_tenant_role recién creado — nunca queda un alta "huérfana"
// sin enrollment, aunque no sea un ROLLBACK real de base de datos.
@Injectable()
export class EnrollmentService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
    private readonly usersService: UsersService,
    private readonly accessRevocationService: AccessRevocationService,
    private readonly membershipPlanService: MembershipPlanService,
    private readonly prospectService: ProspectService,
  ) {}

  async convertir(input: ConvertirProspectoInput): Promise<ConvertirProspectoResultado> {
    const prospecto = await this.prospectService.obtenerPorId(input.organizationId, input.prospectId);
    if (!prospecto) throw new NotFoundException('prospect no encontrado.');
    if (prospecto.converted_at) {
      throw new ConflictException('Este prospect ya fue convertido a inscripción — no se puede convertir dos veces.');
    }

    // 3a: "el prospecto ya tenía user existente → el sistema reutiliza el user existente y solo
    // agrega el nuevo user_tenant_role/enrollment" — altaUsuarioConRolInicial ya implementa
    // exactamente esta reutilización (UC-ID-01/02), aplicada aquí sin duplicar esa lógica.
    const altaResultado = await this.usersService.altaUsuarioConRolInicial({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      fullName: prospecto.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      dateOfBirth: new Date(input.dateOfBirth),
      role: 'player',
      guardianUserId: input.guardianUserId ?? null,
    });

    try {
      // "Activa el membership_plan" — se interpreta como crear el plan del atleta a partir del
      // producto de catálogo elegido (MembershipPlanService.crear ya lo deja en status='active').
      const plan = await this.membershipPlanService.crear({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        athleteUserId: altaResultado.user.id,
        productCatalogId: input.productCatalogId,
        currency: input.currency,
        billingCycle: input.billingCycle,
      });

      const enrollment = await this.db.withTenant(input.organizationId, async (client) => {
        const { rows } = await client.query<EnrollmentRow>(
          `insert into enrollment (organization_id, prospect_id, user_id, plan_id) values ($1, $2, $3, $4) returning *`,
          [input.organizationId, input.prospectId, altaResultado.user.id, plan.id],
        );
        const fila = rows[0];

        await this.auditLog.record(client, {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          entityType: 'enrollment',
          entityId: fila.id,
          newValue: { prospectId: input.prospectId, userId: altaResultado.user.id, planId: plan.id },
        });

        return fila;
      });

      const prospectoConvertido = await this.prospectService.marcarConvertido(input.organizationId, input.actorUserId, input.prospectId);

      return {
        prospect: prospectoConvertido,
        enrollment,
        userId: altaResultado.user.id,
        esMenorDeEdad: altaResultado.esMenorDeEdad,
        guardianLinkId: altaResultado.guardianLinkId,
      };
    } catch (e) {
      await this.accessRevocationService.revocarAcceso({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        userTenantRoleId: altaResultado.userTenantRole.id,
      });
      throw e;
    }
  }
}
