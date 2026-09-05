import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { InventoryCheckoutService } from './inventory-checkout.service.js';

// UC-FAC-02 — Actor: Coach o staff con permiso de check-out. UC-FAC-03 — Actor: Coach o admin.
@Controller('facilities-inventory')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class InventoryCheckoutController {
  constructor(private readonly inventoryCheckoutService: InventoryCheckoutService) {}

  @Post('checkouts')
  checkout(@CurrentUser() actor: AuthenticatedUser, @Body() body: { inventoryItemId: string; quantity: number }) {
    return this.inventoryCheckoutService.checkout({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      inventoryItemId: body.inventoryItemId,
      quantity: body.quantity,
    });
  }

  @Post('checkouts/:id/return')
  devolver(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.inventoryCheckoutService.devolver({ organizationId: actor.organizationId, actorUserId: actor.userId, checkoutId: id });
  }

  @Get('checkouts/pending-return')
  listarPendientesDeDevolucion(@CurrentUser() actor: AuthenticatedUser) {
    return this.inventoryCheckoutService.listarPendientesDeDevolucion(actor.organizationId);
  }

  @Get('venues/:venueId/availability')
  consultarDisponibilidad(@CurrentUser() actor: AuthenticatedUser, @Param('venueId') venueId: string) {
    return this.inventoryCheckoutService.consultarDisponibilidad(actor.organizationId, venueId);
  }
}
