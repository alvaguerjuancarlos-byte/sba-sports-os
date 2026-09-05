import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PaymentsBillingModule } from '../payments-billing/payments-billing.module.js';
import { CalendarRsvpModule } from '../calendar-rsvp/calendar-rsvp.module.js';
import { CallupEngineModule } from '../callup-engine/callup-engine.module.js';
import { ConversionAnalyticsService } from './conversion-analytics.service.js';
import { ConversionAnalyticsController } from './conversion-analytics.controller.js';
import { FinancialReportService } from './financial-report.service.js';
import { FinancialReportController } from './financial-report.controller.js';
import { UnitEconomicsService } from './unit-economics.service.js';
import { UnitEconomicsController } from './unit-economics.controller.js';
import { ExecutiveDashboardService } from './executive-dashboard.service.js';
import { ExecutiveDashboardController } from './executive-dashboard.controller.js';
import { ExecutiveSummaryService } from './executive-summary.service.js';
import { ExportService } from './export.service.js';
import { ConversationalAgentService } from './conversational-agent.service.js';
import { ConversationalAgentController } from './conversational-agent.controller.js';

// Depende de PaymentsBillingModule (UC-RPT-06: saldo), CalendarRsvpModule (UC-RPT-06: calendario)
// y CallupEngineModule (UC-RPT-06: declinar convocatoria) — el agente conversacional delega a los
// mismos servicios permission-aware que un endpoint HTTP normal, nunca query propia. Las
// consultas de reportes (UC-RPT-01/02/03/04, UC-CRM-04) van contra las vistas fact_* (0017), que
// viven en el mismo esquema de base de datos sin necesitar importar los módulos dueños de las
// tablas de origen — no hay servicio que llamar para leer una vista.
@Module({
  imports: [AuthModule, PaymentsBillingModule, CalendarRsvpModule, CallupEngineModule],
  controllers: [
    ConversionAnalyticsController,
    FinancialReportController,
    UnitEconomicsController,
    ExecutiveDashboardController,
    ConversationalAgentController,
  ],
  providers: [
    ConversionAnalyticsService,
    FinancialReportService,
    UnitEconomicsService,
    ExecutiveDashboardService,
    ExecutiveSummaryService,
    ExportService,
    ConversationalAgentService,
  ],
  exports: [
    ConversionAnalyticsService,
    FinancialReportService,
    UnitEconomicsService,
    ExecutiveDashboardService,
    ExecutiveSummaryService,
    ExportService,
    ConversationalAgentService,
  ],
})
export class ReportingAiModule {}
