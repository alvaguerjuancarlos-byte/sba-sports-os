import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { CalendarService } from './calendar.service.js';

// UC-CAL-04 — "cada rol ve el calendario filtrado a su alcance" — sin @Roles, el filtrado por rol
// ocurre dentro de CalendarService.
@Controller('calendar-rsvp/calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  consultar(@CurrentUser() actor: AuthenticatedUser) {
    return this.calendarService.consultar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      actorRoles: actor.roles,
    });
  }
}
