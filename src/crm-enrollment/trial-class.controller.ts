import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { TrialClassService } from './trial-class.service.js';

// UC-CRM-02 — Actor: "Staff comercial (agenda); coach o staff en sede (registra asistencia)".
@Controller('crm-enrollment')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director', 'coach')
export class TrialClassController {
  constructor(private readonly service: TrialClassService) {}

  @Post('prospects/:prospectId/trial-classes')
  agendar(@CurrentUser() actor: AuthenticatedUser, @Param('prospectId') prospectId: string, @Body() body: { eventId: string }) {
    return this.service.agendar({ organizationId: actor.organizationId, actorUserId: actor.userId, prospectId, eventId: body.eventId });
  }

  @Post('trial-classes/:id/attendance')
  marcarAsistencia(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() body: { attended: boolean }) {
    return this.service.marcarAsistencia({ organizationId: actor.organizationId, actorUserId: actor.userId, trialClassAttendanceId: id, attended: body.attended });
  }

  @Get('prospects/:prospectId/trial-classes')
  listarPorProspecto(@CurrentUser() actor: AuthenticatedUser, @Param('prospectId') prospectId: string) {
    return this.service.listarPorProspecto(actor.organizationId, prospectId);
  }
}
