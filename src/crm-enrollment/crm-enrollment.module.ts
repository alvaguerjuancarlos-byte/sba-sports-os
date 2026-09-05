import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { CalendarRsvpModule } from '../calendar-rsvp/calendar-rsvp.module.js';
import { PaymentsBillingModule } from '../payments-billing/payments-billing.module.js';
import { ProspectService } from './prospect.service.js';
import { ProspectController } from './prospect.controller.js';
import { TrialClassService } from './trial-class.service.js';
import { TrialClassController } from './trial-class.controller.js';
import { EnrollmentService } from './enrollment.service.js';
import { EnrollmentController } from './enrollment.controller.js';

// Depende de IdentityAccessModule (UC-CRM-03: alta/reutilización de user + guardian_link),
// CalendarRsvpModule (UC-CRM-02: event de la clase de prueba) y PaymentsBillingModule (UC-CRM-03:
// membership_plan) — nunca lee sus tablas directo, siempre vía los servicios exportados.
@Module({
  imports: [AuditLogModule, AuthModule, IdentityAccessModule, CalendarRsvpModule, PaymentsBillingModule],
  controllers: [ProspectController, TrialClassController, EnrollmentController],
  providers: [ProspectService, TrialClassService, EnrollmentService],
  exports: [ProspectService, TrialClassService, EnrollmentService],
})
export class CrmEnrollmentModule {}
