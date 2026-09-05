import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CalendarRsvpModule } from '../calendar-rsvp/calendar-rsvp.module.js';
import { CallupEngineModule } from '../callup-engine/callup-engine.module.js';
import { MatchLineupService } from './match-lineup.service.js';
import { MatchLineupController } from './match-lineup.controller.js';
import { MatchEventService } from './match-event.service.js';
import { MatchEventController } from './match-event.controller.js';
import { MatchClosingService } from './match-closing.service.js';
import { MatchClosingController } from './match-closing.controller.js';
import { MatchQueryService } from './match-query.service.js';
import { MatchQueryController } from './match-query.controller.js';

// Integridad referencial UC-CUP↔UC-MAT: depende de CallupEngineModule para validar que un jugador
// pasó por Call-up Engine antes de poder alinearlo — nunca SELECT directo contra
// callup_slot/callup_list. También depende de CalendarRsvpModule (event, league_cup_id/team_id).
@Module({
  imports: [AuthModule, CalendarRsvpModule, CallupEngineModule],
  controllers: [MatchLineupController, MatchEventController, MatchClosingController, MatchQueryController],
  providers: [MatchLineupService, MatchEventService, MatchClosingService, MatchQueryService],
  exports: [MatchLineupService, MatchEventService, MatchClosingService, MatchQueryService],
})
export class MatchCenterModule {}
