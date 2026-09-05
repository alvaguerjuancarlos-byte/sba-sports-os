import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { MatchClosingService } from './match-closing.service.js';

// UC-MAT-03 — Actor: Coach o staff.
@Controller('match-center/events/:eventId')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class MatchClosingController {
  constructor(private readonly matchClosingService: MatchClosingService) {}

  @Post('close')
  cerrar(@CurrentUser() actor: AuthenticatedUser, @Param('eventId') eventId: string, @Body() body: { finalMinute: number }) {
    return this.matchClosingService.cerrar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      eventId,
      finalMinute: body.finalMinute,
    });
  }
}
