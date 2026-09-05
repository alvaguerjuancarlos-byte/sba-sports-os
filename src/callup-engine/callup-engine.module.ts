import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { SportsHubModule } from '../sports-hub/sports-hub.module.js';
import { CalendarRsvpModule } from '../calendar-rsvp/calendar-rsvp.module.js';
import { AttendanceRealtimeModule } from '../attendance-realtime/attendance-realtime.module.js';
import { PaymentsBillingModule } from '../payments-billing/payments-billing.module.js';
import { CallupFormatRuleService } from './callup-format-rule.service.js';
import { CallupFormatRuleController } from './callup-format-rule.controller.js';
import { CallupPriorityService } from './callup-priority.service.js';
import { CallupListService } from './callup-list.service.js';
import { CallupListController } from './callup-list.controller.js';
import { CallupResponseService } from './callup-response.service.js';
import { CallupResponseController } from './callup-response.controller.js';
import { CallupWaiverService } from './callup-waiver.service.js';
import { CallupWaiverController } from './callup-waiver.controller.js';
import { CallupQueryService } from './callup-query.service.js';
import { CallupQueryController } from './callup-query.controller.js';

// El dominio más cross-cutting del sistema: integra Identity & Access (menores/guardian_link),
// Sports Hub (team, roster_membership), Calendar & RSVP (event) y Payments & Billing (UC-PAY-05,
// elegibilidad financiera) — todos vía sus servicios exportados, nunca SELECT directo.
@Module({
  imports: [
    AuditLogModule,
    AuthModule,
    IdentityAccessModule,
    SportsHubModule,
    CalendarRsvpModule,
    AttendanceRealtimeModule,
    PaymentsBillingModule,
  ],
  controllers: [
    CallupFormatRuleController,
    CallupListController,
    CallupResponseController,
    CallupWaiverController,
    CallupQueryController,
  ],
  providers: [
    CallupFormatRuleService,
    CallupPriorityService,
    CallupListService,
    CallupResponseService,
    CallupWaiverService,
    CallupQueryService,
  ],
  exports: [
    CallupFormatRuleService,
    CallupPriorityService,
    CallupListService,
    CallupResponseService,
    CallupWaiverService,
    CallupQueryService,
  ],
})
export class CallupEngineModule {}
