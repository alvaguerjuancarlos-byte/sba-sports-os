import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import { ProductCatalogService } from '../configuration-studio/product-catalog.service.js';
import { MembershipPlanService } from './membership-plan.service.js';
import { calcularMontoConBeca, type InvoiceRow } from './payments-billing.types.js';

export interface GenerarInvoiceInput {
  organizationId: string;
  actorUserId: string;
  athleteUserId: string;
  membershipPlanId?: string | null;
  productCatalogId?: string | null; // cargo ad hoc, sin membership_plan
  dueDate: string;
}

// UC-PAY-02 — Generar factura a cuenta familiar.
@Injectable()
export class InvoiceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
    private readonly membershipPlanService: MembershipPlanService,
    private readonly productCatalogService: ProductCatalogService,
  ) {}

  async generar(input: GenerarInvoiceInput): Promise<InvoiceRow> {
    // Criterio de aceptación: "toda invoice referencia un membership_plan o un producto de
    // catálogo válido — nunca un monto libre sin origen trazable."
    if (!input.membershipPlanId && !input.productCatalogId) {
      throw new BadRequestException('Se requiere membershipPlanId o productCatalogId para generar la factura.');
    }

    const plan = input.membershipPlanId
      ? await this.membershipPlanService.obtenerPorId(input.organizationId, input.membershipPlanId)
      : null;
    const productCatalogId = plan ? plan.product_catalog_id : (input.productCatalogId as string);

    const producto = await this.productCatalogService.obtenerPorId(input.organizationId, productCatalogId);
    if (!producto) throw new NotFoundException('El producto de catálogo indicado no existe.');
    const financialDimensionId = producto.financial_dimension_id ?? null;

    // 1a. "La cuenta tiene una beca activa → el monto de la factura refleja el descuento
    // aplicado, no el precio de catálogo completo." Un cargo ad hoc (sin plan) nunca tiene beca.
    const amountDue = plan ? calcularMontoConBeca(Number(plan.amount), plan) : Number(producto.price);

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<InvoiceRow>(
        `insert into invoice
           (organization_id, athlete_user_id, membership_plan_id, product_catalog_id, financial_dimension_id, amount_due, due_date, status)
         values ($1, $2, $3, $4, $5, $6, $7, 'pending')
         returning *`,
        [
          input.organizationId,
          input.athleteUserId,
          input.membershipPlanId ?? null,
          input.membershipPlanId ? null : productCatalogId,
          financialDimensionId,
          amountDue,
          input.dueDate,
        ],
      );
      const invoice = rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'invoice',
        entityId: invoice.id,
        newValue: { athleteUserId: invoice.athlete_user_id, amountDue: invoice.amount_due, dueDate: invoice.due_date },
      });

      return invoice;
    });
  }
}
