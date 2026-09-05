import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { CallupWaiverService } from './callup-waiver.service.js';
import type { CallupWaiverAction } from './callup-engine.types.js';

// UC-CUP-04 — Actor: Coach.
@Controller('callup-engine/callup-lists/:callupListId/waivers')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class CallupWaiverController {
  constructor(private readonly callupWaiverService: CallupWaiverService) {}

  @Post()
  crear(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('callupListId') callupListId: string,
    @Body() body: { userId: string; action: CallupWaiverAction; internalComment: string },
  ) {
    return this.callupWaiverService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      callupListId,
      userId: body.userId,
      action: body.action,
      internalComment: body.internalComment,
    });
  }
}
