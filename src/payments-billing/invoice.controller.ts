import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { InvoiceService } from './invoice.service.js';
import { calcularEstadoEfectivo } from './payments-billing.types.js';

// UC-PAY-02 — Actor: "Sistema (automático, por ciclo de facturación) o Admin (manual, cargo
// único)". La generación automática por ciclo requeriría un scheduler llamando directo al
// servicio (fuera de alcance de esta pieza, ver CollectionsService) — esta ruta cubre el disparo
// manual por un admin.
@Controller('payments/invoices')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  generar(
    @CurrentUser() actor: AuthenticatedUser,
    @Body()
    body: { athleteUserId: string; membershipPlanId?: string; productCatalogId?: string; dueDate: string },
  ) {
    return this.invoiceService.generar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      athleteUserId: body.athleteUserId,
      membershipPlanId: body.membershipPlanId ?? null,
      productCatalogId: body.productCatalogId ?? null,
      dueDate: body.dueDate,
    });
  }

  // Criterio de aceptación UC-PAY-02: "overdue" nunca se almacena, se deriva aquí para la pantalla.
  @Get()
  async listar(@CurrentUser() actor: AuthenticatedUser) {
    const invoices = await this.invoiceService.listar(actor.organizationId);
    return invoices.map((invoice) => ({ ...invoice, effective_status: calcularEstadoEfectivo(invoice.status, invoice.due_date) }));
  }
}
