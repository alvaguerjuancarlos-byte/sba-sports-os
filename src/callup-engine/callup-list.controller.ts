import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { CallupListService } from './callup-list.service.js';

// UC-CUP-01 — Actor: Coach (dispara).
@Controller('callup-engine/callup-lists')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class CallupListController {
  constructor(private readonly callupListService: CallupListService) {}

  @Post()
  generar(@CurrentUser() actor: AuthenticatedUser, @Body() body: { eventId: string; format: string }) {
    return this.callupListService.generar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      eventId: body.eventId,
      format: body.format,
    });
  }
}
