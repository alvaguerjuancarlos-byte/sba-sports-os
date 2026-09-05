import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SportsHubModule } from '../sports-hub/sports-hub.module.js';
import { EmployeeService } from './employee.service.js';
import { EmployeeController } from './employee.controller.js';
import { PayrollInputService } from './payroll-input.service.js';
import { PayrollInputController } from './payroll-input.controller.js';
import { EmployeeAttendanceService } from './employee-attendance.service.js';
import { EmployeeAttendanceController } from './employee-attendance.controller.js';
import { CoachObjectiveService } from './coach-objective.service.js';
import { CoachObjectiveController } from './coach-objective.controller.js';
import { CoachDevelopmentSummaryService } from './coach-development-summary.service.js';
import { CoachDevelopmentSummaryController } from './coach-development-summary.controller.js';

// Depende de SportsHubModule (UC-HR-05: roster/team/league_standing) — nunca lee sus tablas
// directo, siempre vía los servicios exportados.
@Module({
  imports: [AuditLogModule, AuthModule, SportsHubModule],
  controllers: [EmployeeController, PayrollInputController, EmployeeAttendanceController, CoachObjectiveController, CoachDevelopmentSummaryController],
  providers: [EmployeeService, PayrollInputService, EmployeeAttendanceService, CoachObjectiveService, CoachDevelopmentSummaryService],
  exports: [EmployeeService, PayrollInputService, EmployeeAttendanceService, CoachObjectiveService, CoachDevelopmentSummaryService],
})
export class HrCoachHubModule {}
