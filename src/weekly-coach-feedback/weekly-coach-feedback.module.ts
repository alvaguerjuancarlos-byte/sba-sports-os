import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { SportsHubModule } from '../sports-hub/sports-hub.module.js';
import { WeeklyFeedbackQuestionConfigService } from './weekly-feedback-question-config.service.js';
import { WeeklyFeedbackQuestionConfigController } from './weekly-feedback-question-config.controller.js';
import { WeeklyFeedbackService } from './weekly-feedback.service.js';
import { WeeklyFeedbackController } from './weekly-feedback.controller.js';
import { WeeklyFeedbackQueryService } from './weekly-feedback-query.service.js';
import { WeeklyFeedbackQueryController } from './weekly-feedback-query.controller.js';

// Depende de SportsHubModule (UC-WCF-01: roster del equipo) y de IdentityAccessModule (UC-WCF-02:
// guardian_link para el scope de familia) — nunca lee sus tablas directo, siempre vía los
// servicios exportados.
@Module({
  imports: [AuditLogModule, AuthModule, IdentityAccessModule, SportsHubModule],
  controllers: [WeeklyFeedbackQuestionConfigController, WeeklyFeedbackController, WeeklyFeedbackQueryController],
  providers: [WeeklyFeedbackQuestionConfigService, WeeklyFeedbackService, WeeklyFeedbackQueryService],
  exports: [WeeklyFeedbackQuestionConfigService, WeeklyFeedbackService, WeeklyFeedbackQueryService],
})
export class WeeklyCoachFeedbackModule {}
