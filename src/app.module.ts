import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './db/database.module.js';
import { IdentityAccessModule } from './identity-access/identity-access.module.js';
import { ConfigurationStudioModule } from './configuration-studio/configuration-studio.module.js';
import { AdminHubModule } from './admin-hub/admin-hub.module.js';
import { PaymentsBillingModule } from './payments-billing/payments-billing.module.js';
import { SportsHubModule } from './sports-hub/sports-hub.module.js';
import { CalendarRsvpModule } from './calendar-rsvp/calendar-rsvp.module.js';
import { AttendanceRealtimeModule } from './attendance-realtime/attendance-realtime.module.js';
import { FacilitiesInventoryModule } from './facilities-inventory/facilities-inventory.module.js';
import { CallupEngineModule } from './callup-engine/callup-engine.module.js';
import { MatchCenterModule } from './match-center/match-center.module.js';
import { WeeklyCoachFeedbackModule } from './weekly-coach-feedback/weekly-coach-feedback.module.js';
import { PerformanceModule } from './performance/performance.module.js';
import { PlayerCardModule } from './player-card/player-card.module.js';
import { CrmEnrollmentModule } from './crm-enrollment/crm-enrollment.module.js';

@Module({
  imports: [
    DatabaseModule,
    IdentityAccessModule,
    ConfigurationStudioModule,
    AdminHubModule,
    PaymentsBillingModule,
    SportsHubModule,
    CalendarRsvpModule,
    AttendanceRealtimeModule,
    FacilitiesInventoryModule,
    CallupEngineModule,
    MatchCenterModule,
    WeeklyCoachFeedbackModule,
    PerformanceModule,
    PlayerCardModule,
    CrmEnrollmentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
