import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { PurchaseOrderService } from './purchase-order.service.js';

// UC-ADM-04 — Actor: Admin de compras.
@Controller('admin-hub/purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Post()
  emitir(@CurrentUser() actor: AuthenticatedUser, @Body() body: { purchaseRequestId: string; vendorId: string }) {
    return this.purchaseOrderService.emitir({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      purchaseRequestId: body.purchaseRequestId,
      vendorId: body.vendorId,
    });
  }
}
