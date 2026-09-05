import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { EventService } from './event.service.js';
import type { EventType } from './calendar-rsvp.types.js';

// UC-CAL-01 — Actor: Coach o admin con permiso sobre el equipo/organización. MFA sigue siendo
// opcional para coach aquí (no es Admin Hub/Payments, UC-ID-04) — no se usa @RequireMfaFor.
@Controller('calendar-rsvp/events')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  crear(
    @CurrentUser() actor: AuthenticatedUser,
    @Body()
    body: {
      type: EventType;
      teamId?: string;
      leagueCupId?: string;
      venueId: string;
      startAt: string;
      endAt: string;
      forceOverlap?: boolean;
    },
  ) {
    return this.eventService.crear({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorRoles: actor.roles,
      type: body.type,
      teamId: body.teamId ?? null,
      leagueCupId: body.leagueCupId ?? null,
      venueId: body.venueId,
      startAt: body.startAt,
      endAt: body.endAt,
      forceOverlap: body.forceOverlap ?? false,
    });
  }
}
