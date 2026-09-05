import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { SportsHubModule } from '../sports-hub/sports-hub.module.js';
import { VenueService } from './venue.service.js';
import { VenueController } from './venue.controller.js';
import { EventService } from './event.service.js';
import { EventController } from './event.controller.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceController } from './attendance.controller.js';
import { CalendarService } from './calendar.service.js';
import { CalendarController } from './calendar.controller.js';

// Depende de IdentityAccessModule (UC-CAL-03: guardian_link, date_of_birth) y de SportsHubModule
// (UC-CAL-01: roster del equipo para generar RSVP; UC-CAL-04: equipos por usuario) — nunca lee sus
// tablas directo, siempre vía los servicios que esos módulos exportan.
@Module({
  imports: [AuditLogModule, AuthModule, IdentityAccessModule, SportsHubModule],
  controllers: [VenueController, EventController, AttendanceController, CalendarController],
  providers: [VenueService, EventService, AttendanceService, CalendarService],
  exports: [VenueService, EventService, AttendanceService, CalendarService],
})
export class CalendarRsvpModule {}
