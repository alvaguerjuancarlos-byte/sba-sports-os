import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SportsHubModule } from '../sports-hub/sports-hub.module.js';
import { MatchCenterModule } from '../match-center/match-center.module.js';
import { WeeklyCoachFeedbackModule } from '../weekly-coach-feedback/weekly-coach-feedback.module.js';
import { AttendanceRealtimeModule } from '../attendance-realtime/attendance-realtime.module.js';
import { PerformanceAssessmentService } from './performance-assessment.service.js';
import { PerformanceAssessmentController } from './performance-assessment.controller.js';
import { DevelopmentMapService } from './development-map.service.js';
import { DevelopmentMapController } from './development-map.controller.js';
import { AiSuggestionService } from './ai-suggestion.service.js';
import { AiSuggestionController } from './ai-suggestion.controller.js';

// Depende de SportsHubModule (roster/team para resolver el scope de agregación), MatchCenterModule
// (player_statistic, UC-PRF-01), WeeklyCoachFeedbackModule (weekly_feedback, UC-PRF-01) y
// AttendanceRealtimeModule (checkin_event, UC-PRF-01) — nunca lee sus tablas directo, siempre vía
// los servicios exportados.
@Module({
  imports: [AuditLogModule, AuthModule, SportsHubModule, MatchCenterModule, WeeklyCoachFeedbackModule, AttendanceRealtimeModule],
  controllers: [PerformanceAssessmentController, DevelopmentMapController, AiSuggestionController],
  providers: [PerformanceAssessmentService, DevelopmentMapService, AiSuggestionService],
  exports: [PerformanceAssessmentService, DevelopmentMapService, AiSuggestionService],
})
export class PerformanceModule {}
