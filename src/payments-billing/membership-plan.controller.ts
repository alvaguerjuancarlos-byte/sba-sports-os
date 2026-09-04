import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { MembershipPlanService } from './membership-plan.service.js';
import { redactarBecaSiNoTieneScope, type BillingCycle } from './payments-billing.types.js';

// UC-PAY-01 — Actor: Admin financiero/comercial. UC-PAY-04 — Actor: Admin financiero con scope
// elevado (ver puedeAprobar-equivalente en aplicarBeca, MembershipPlanService).
@Controller('payments/membership-plans')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class MembershipPlanController {
  constructor(private readonly membershipPlanService: MembershipPlanService) {}

  @Post()
  crear(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { athleteUserId: string; productCatalogId: string; currency: string; billingCycle: BillingCycle },
  ) {
    return this.membershipPlanService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      athleteUserId: body.athleteUserId,
      productCatalogId: body.productCatalogId,
      currency: body.currency,
      billingCycle: body.billingCycle,
    });
  }

  @Post(':id/cancel')
  cancelar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.membershipPlanService.cancelar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      membershipPlanId: id,
    });
  }

  // UC-PAY-04 — el scope de beca se valida dentro del servicio (solo 'director'), no aquí — mismo
  // patrón que la escalación de excepciones en Admin Hub (UC-ADM-03).
  @Post(':id/scholarship')
  aplicarBeca(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { scholarshipAmount?: number; scholarshipPct?: number },
  ) {
    return this.membershipPlanService.aplicarBeca({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorRoles: actor.roles,
      membershipPlanId: id,
      scholarshipAmount: body.scholarshipAmount ?? null,
      scholarshipPct: body.scholarshipPct ?? null,
    });
  }

  // Criterio de aceptación UC-PAY-04: "un usuario sin el scope de beca nunca ve el detalle de la
  // beca en ninguna pantalla" — la redacción ocurre aquí, en el borde de salida hacia el cliente.
  @Get(':id')
  async obtener(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    const plan = await this.membershipPlanService.obtenerPorId(actor.organizationId, id);
    return redactarBecaSiNoTieneScope(plan, actor.roles);
  }
}
