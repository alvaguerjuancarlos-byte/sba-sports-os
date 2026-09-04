import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { AccessRevocationService } from './access-revocation.service.js';

// UC-ID-05 — Actor: Admin de organización.
@Controller('identity/user-tenant-roles')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class AccessRevocationController {
  constructor(private readonly accessRevocationService: AccessRevocationService) {}

  @Post(':id/revoke')
  revocarAcceso(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.accessRevocationService.revocarAcceso({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      userTenantRoleId: id,
    });
  }
}
