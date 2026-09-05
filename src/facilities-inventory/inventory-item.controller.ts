import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { InventoryItemService } from './inventory-item.service.js';
import type { InventoryItemStatus } from './facilities-inventory.types.js';

// UC-FAC-01 — Actor: Admin de sede.
@Controller('facilities-inventory/items')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class InventoryItemController {
  constructor(private readonly inventoryItemService: InventoryItemService) {}

  @Post()
  crear(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() body: { venueId: string; name: string; category: string; quantityTotal: number },
  ) {
    return this.inventoryItemService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      venueId: body.venueId,
      name: body.name,
      category: body.category,
      quantityTotal: body.quantityTotal,
    });
  }

  @Post(':id/archive')
  archivar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.inventoryItemService.archivar({ organizationId: actor.organizationId, actorUserId: actor.userId, inventoryItemId: id });
  }

  @Get()
  listar(@CurrentUser() actor: AuthenticatedUser, @Query('venueId') venueId?: string, @Query('status') status?: InventoryItemStatus) {
    return this.inventoryItemService.listar(actor.organizationId, { venueId, status });
  }
}
