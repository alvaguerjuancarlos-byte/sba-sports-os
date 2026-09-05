import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard, RequireMfaFor } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { PurchaseRequestService } from './purchase-request.service.js';
import { PurchaseApprovalService } from './purchase-approval.service.js';

// UC-ADM-02 — Actor: "cualquier rol con permiso de gasto (coach, staff, admin de área)" — a
// diferencia del resto de Admin Hub, coach también puede capturar una solicitud.
@Controller('admin-hub/purchase-requests')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('coach', 'admin', 'director')
export class PurchaseRequestController {
  constructor(
    private readonly purchaseRequestService: PurchaseRequestService,
    private readonly purchaseApprovalService: PurchaseApprovalService,
  ) {}

  // "cualquier rol con acceso a Admin Hub/Payments" requiere MFA (UC-ID-04) — coach normalmente no
  // lo necesita, pero aquí sí toca Admin Hub, así que se extiende explícitamente solo en esta ruta.
  @Post()
  @RequireMfaFor('admin', 'director', 'coach')
  crear(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { budgetLineId: string; amount: string | number; justification?: string },
  ) {
    return this.purchaseRequestService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      budgetLineId: body.budgetLineId,
      amount: body.amount,
      justification: body.justification ?? null,
    });
  }

  // UC-ADM-03 — Actor: Aprobador (admin/director; excepción requiere director, ver
  // admin-hub.types.ts puedeAprobar). Ruta separada de @Roles porque coach nunca puede aprobar,
  // solo capturar.
  @Post(':id/approve')
  @Roles('admin', 'director')
  aprobar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.purchaseApprovalService.aprobar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorRoles: actor.roles,
      purchaseRequestId: id,
    });
  }

  @Post(':id/reject')
  @Roles('admin', 'director')
  rechazar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: { rejectionReason: string }) {
    return this.purchaseApprovalService.rechazar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      purchaseRequestId: id,
      rejectionReason: body.rejectionReason,
    });
  }
}
