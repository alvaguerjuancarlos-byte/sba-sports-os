import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { SportsHubModule } from '../sports-hub/sports-hub.module.js';
import { CalendarRsvpModule } from '../calendar-rsvp/calendar-rsvp.module.js';
import { BiometricConsentService } from './biometric-consent.service.js';
import { BiometricConsentController } from './biometric-consent.controller.js';
import { CheckinService } from './checkin.service.js';
import { CheckinController } from './checkin.controller.js';

// Depende de IdentityAccessModule (UC-ATT-05: guardian_link, date_of_birth), SportsHubModule
// (UC-ATT-02/03: roster esperado del equipo) y CalendarRsvpModule (UC-ATT-01/02: el event y su
// venue/ventana) — nunca lee sus tablas directo, siempre vía los servicios exportados.
@Module({
  imports: [AuditLogModule, AuthModule, IdentityAccessModule, SportsHubModule, CalendarRsvpModule],
  controllers: [BiometricConsentController, CheckinController],
  providers: [BiometricConsentService, CheckinService],
  exports: [BiometricConsentService, CheckinService],
})
export class AttendanceRealtimeModule {}
