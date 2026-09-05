import { Module } from '@nestjs/common';
import { AuditLogModule } from '../shared/audit-log/audit-log.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { SeasonService } from './season.service.js';
import { SeasonController } from './season.controller.js';
import { TeamService } from './team.service.js';
import { TeamController } from './team.controller.js';
import { RosterService } from './roster.service.js';
import { RosterController } from './roster.controller.js';
import { LeagueService } from './league.service.js';
import { LeagueController } from './league.controller.js';

// Depende de IdentityAccessModule para UC-SPT-03 ("ningún roster_membership sin
// user_tenant_role activo") — nunca hace SELECT directo contra user_tenant_role.
@Module({
  imports: [AuditLogModule, AuthModule, IdentityAccessModule],
  controllers: [SeasonController, TeamController, RosterController, LeagueController],
  providers: [SeasonService, TeamService, RosterService, LeagueService],
  exports: [SeasonService, TeamService, RosterService, LeagueService],
})
export class SportsHubModule {}
