import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { SportsHubModule } from '../sports-hub/sports-hub.module.js';
import { MatchCenterModule } from '../match-center/match-center.module.js';
import { PerformanceModule } from '../performance/performance.module.js';
import { AttendanceRealtimeModule } from '../attendance-realtime/attendance-realtime.module.js';
import { CalendarRsvpModule } from '../calendar-rsvp/calendar-rsvp.module.js';
import { PaymentsBillingModule } from '../payments-billing/payments-billing.module.js';
import { AthleteMedicalNoteService } from './athlete-medical-note.service.js';
import { AthleteNutritionNoteService } from './athlete-nutrition-note.service.js';
import { MediaConsentService } from './media-consent.service.js';
import { MediaConsentController } from './media-consent.controller.js';
import { GalleryService } from './gallery.service.js';
import { GalleryController } from './gallery.controller.js';
import { PlayerCardQueryService } from './player-card-query.service.js';
import { PlayerCardQueryController } from './player-card-query.controller.js';
import { PlayerCardWriteController } from './player-card-write.controller.js';

// Player Card ensambla datos de Identity & Access, Sports Hub, Match Center, Performance,
// Attendance/Real-Time, Calendar & RSVP y Payments & Billing — nunca lee sus tablas directo,
// siempre vía los servicios exportados de cada uno.
@Module({
  imports: [
    AuditLogModule,
    AuthModule,
    IdentityAccessModule,
    SportsHubModule,
    MatchCenterModule,
    PerformanceModule,
    AttendanceRealtimeModule,
    CalendarRsvpModule,
    PaymentsBillingModule,
  ],
  controllers: [PlayerCardQueryController, PlayerCardWriteController, MediaConsentController, GalleryController],
  providers: [AthleteMedicalNoteService, AthleteNutritionNoteService, MediaConsentService, GalleryService, PlayerCardQueryService],
  exports: [AthleteMedicalNoteService, AthleteNutritionNoteService, MediaConsentService, GalleryService, PlayerCardQueryService],
})
export class PlayerCardModule {}
