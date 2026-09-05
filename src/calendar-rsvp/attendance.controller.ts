import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { AttendanceService } from './attendance.service.js';
import type { RsvpStatus } from './calendar-rsvp.types.js';

// UC-CAL-03 — Actor: padre/tutor o el propio jugador. Sin @Roles (mismo patrón que
// GuardianConsentController/BalanceController) — el gate real de "quién puede responder" vive en
// AttendanceService, no aquí.
@Controller('calendar-rsvp/attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post(':id/respond')
  responder(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { decision: Extract<RsvpStatus, 'confirmed' | 'declined'> },
  ) {
    return this.attendanceService.responder({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      attendanceId: id,
      decision: body.decision,
    });
  }
}
