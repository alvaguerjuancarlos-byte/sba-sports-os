import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { VendorService } from './vendor.service.js';
import type { AdminHubStatus } from './admin-hub.types.js';

// UC-ADM-06 — Actor: Admin de compras.
@Controller('admin-hub/vendors')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post()
  crear(@CurrentUser() actor: AuthenticatedUser, @Body() body: { name: string; taxId?: string }) {
    return this.vendorService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      name: body.name,
      taxId: body.taxId ?? null,
    });
  }

  @Post(':id/archive')
  archivar(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.vendorService.archivar({ organizationId: actor.organizationId, actorUserId: actor.userId, vendorId: id });
  }

  @Get()
  listar(@CurrentUser() actor: AuthenticatedUser, @Query('status') status?: AdminHubStatus) {
    return this.vendorService.listar(actor.organizationId, { status });
  }
}
