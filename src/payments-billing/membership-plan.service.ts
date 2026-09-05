import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { ProductCatalogService } from '../configuration-studio/product-catalog.service.js';
import { tieneScopeDeBeca, type BillingCycle, type MembershipPlanRow } from './payments-billing.types.js';

export interface CrearMembershipPlanInput {
  organizationId: string;
  actorUserId: string;
  athleteUserId: string;
  productCatalogId: string;
  currency: string;
  billingCycle: BillingCycle;
}

export interface CancelarMembershipPlanInput {
  organizationId: string;
  actorUserId: string;
  membershipPlanId: string;
}

export interface AplicarBecaInput {
  organizationId: string;
  actorUserId: string;
  actorRoles: string[];
  membershipPlanId: string;
  scholarshipAmount?: number | null;
  scholarshipPct?: number | null;
}

// UC-PAY-01 — Configurar plan de membresía o cargo. UC-PAY-04 — Aplicar beca o descuento.
//
// Nota de diseño: este servicio siempre regresa la fila completa (sin redactar) — la redacción de
// campos de beca para lectores sin scope (ver payments-billing.types.ts,
// redactarBecaSiNoTieneScope) es responsabilidad del controller, que sabe qué canal/pantalla está
// sirviendo la respuesta, no del servicio.
@Injectable()
export class MembershipPlanService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
    private readonly productCatalogService: ProductCatalogService,
  ) {}

  // "a partir de un producto del catálogo (UC-CFG-02)" — copia nombre/precio al momento de crear,
  // vía el servicio de Configuration Studio (nunca SELECT directo a product_catalog).
  async crear(input: CrearMembershipPlanInput): Promise<MembershipPlanRow> {
    const producto = await this.productCatalogService.obtenerPorId(input.organizationId, input.productCatalogId);
    if (!producto) throw new NotFoundException('El producto de catálogo indicado no existe.');

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<MembershipPlanRow>(
        `insert into membership_plan (organization_id, athlete_user_id, product_catalog_id, name, amount, currency, billing_cycle, status)
         values ($1, $2, $3, $4, $5, $6, $7, 'active')
         returning *`,
        [
          input.organizationId,
          input.athleteUserId,
          input.productCatalogId,
          producto.name,
          producto.price,
          input.currency,
          input.billingCycle,
        ],
      );
      const plan = rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'membership_plan',
        entityId: plan.id,
        newValue: {
          athleteUserId: plan.athlete_user_id,
          productCatalogId: plan.product_catalog_id,
          amount: plan.amount,
          billingCycle: plan.billing_cycle,
        },
      });

      return plan;
    });
  }

  async cancelar(input: CancelarMembershipPlanInput): Promise<MembershipPlanRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<MembershipPlanRow>(`select * from membership_plan where id = $1`, [
        input.membershipPlanId,
      ]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('membership_plan no encontrado.');

      const { rows: updated } = await client.query<MembershipPlanRow>(
        `update membership_plan set status = 'cancelled' where id = $1 returning *`,
        [input.membershipPlanId],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'membership_plan',
        entityId: anterior.id,
        fieldChanged: 'status',
        oldValue: { status: anterior.status },
        newValue: { status: 'cancelled' },
      });

      return updated[0];
    });
  }

  // UC-PAY-04 — "el actor tiene el scope de permiso específico para datos de beca — no basta el
  // rol general de 'admin financiero'." [propuesto] scope = rol 'director' (ver
  // payments-billing.types.ts, tieneScopeDeBeca).
  async aplicarBeca(input: AplicarBecaInput): Promise<MembershipPlanRow> {
    if (!tieneScopeDeBeca(input.actorRoles)) {
      throw new ForbiddenException('Aplicar una beca requiere el scope de datos de beca (rol director).');
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<MembershipPlanRow>(`select * from membership_plan where id = $1`, [
        input.membershipPlanId,
      ]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('membership_plan no encontrado.');

      const { rows: updated } = await client.query<MembershipPlanRow>(
        `update membership_plan
         set scholarship_flag = true, scholarship_amount = $2, scholarship_pct = $3
         where id = $1
         returning *`,
        [input.membershipPlanId, input.scholarshipAmount ?? null, input.scholarshipPct ?? null],
      );

      // Criterio de aceptación: "el cambio de beca queda auditado igual que cualquier cambio
      // financiero" — el audit_log no redacta (es el registro en sí, visto solo por quien ya
      // consulta auditoría); la redacción de pantallas normales pasa por el controller.
      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'membership_plan',
        entityId: anterior.id,
        fieldChanged: 'scholarship',
        oldValue: { scholarshipFlag: anterior.scholarship_flag },
        newValue: {
          scholarshipFlag: true,
          scholarshipAmount: input.scholarshipAmount ?? null,
          scholarshipPct: input.scholarshipPct ?? null,
        },
      });

      return updated[0];
    });
  }

  async listar(organizationId: string): Promise<MembershipPlanRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<MembershipPlanRow>(`select * from membership_plan order by created_at desc`);
      return rows;
    });
  }

  async obtenerPorId(organizationId: string, membershipPlanId: string): Promise<MembershipPlanRow> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<MembershipPlanRow>(`select * from membership_plan where id = $1`, [
        membershipPlanId,
      ]);
      const plan = rows[0];
      if (!plan) throw new NotFoundException('membership_plan no encontrado.');
      return plan;
    });
  }
}
