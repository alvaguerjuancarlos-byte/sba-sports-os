import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { CheckinService } from './checkin.service.js';

// UC-ATT-01/02 — Actor: coach o encargado de sede confirmando el check-in de otra persona (el
// reconocimiento facial en sí lo resuelve el proveedor externo, no un JWT por persona que hace
// fila). UC-ATT-03/04 — mismos roles operativos.
@Controller('attendance-realtime')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post('checkins/facial')
  registrarFacial(@CurrentUser() actor: AuthenticatedUser, @Body() body: { eventId: string; userId: string }) {
    return this.checkinService.registrarFacial({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      eventId: body.eventId,
      userId: body.userId,
    });
  }

  @Post('checkins/manual')
  registrarManual(@CurrentUser() actor: AuthenticatedUser, @Body() body: { eventId: string; userId: string }) {
    return this.checkinService.registrarManual({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      eventId: body.eventId,
      userId: body.userId,
    });
  }

  @Get('events/:eventId/attendance-review')
  revisarAsistencia(@CurrentUser() actor: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.checkinService.revisarAsistencia(actor.organizationId, eventId);
  }

  @Get('events/:eventId/headcount')
  aforoPorEvento(@CurrentUser() actor: AuthenticatedUser, @Param('eventId') eventId: string) {
    return this.checkinService.aforoPorEvento(actor.organizationId, eventId);
  }

  @Get('venues/:venueId/headcount')
  aforoPorSede(@CurrentUser() actor: AuthenticatedUser, @Param('venueId') venueId: string) {
    return this.checkinService.aforoPorSede(actor.organizationId, venueId);
  }
}
