import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { MatchEventService } from './match-event.service.js';
import type { MatchCardColor, MatchEventType } from './match-center.types.js';

// UC-MAT-02 — Actor: Coach o staff en cancha.
@Controller('match-center/events/:eventId/match-events')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class MatchEventController {
  constructor(private readonly matchEventService: MatchEventService) {}

  @Post()
  registrar(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Body()
    body: {
      type: MatchEventType;
      minute: number;
      playerLineupId: string;
      cardColor?: MatchCardColor;
      substituteCallupSlotId?: string;
      substitutePosition?: string;
      substituteFormationSlot?: string;
    },
  ) {
    return this.matchEventService.registrar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      eventId,
      type: body.type,
      minute: body.minute,
      playerLineupId: body.playerLineupId,
      cardColor: body.cardColor ?? null,
      substituteCallupSlotId: body.substituteCallupSlotId,
      substitutePosition: body.substitutePosition,
      substituteFormationSlot: body.substituteFormationSlot,
    });
  }

  @Post('opponent-score')
  actualizarMarcadorRival(@CurrentUser() actor: AuthenticatedUser, @Param('eventId') eventId: string, @Body() body: { opponentScore: number }) {
    return this.matchEventService.actualizarMarcadorRival({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      eventId,
      opponentScore: body.opponentScore,
    });
  }
}
