import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { IdentityAccessModule } from '../identity-access/identity-access.module.js';
import { PlayerCardModule } from '../player-card/player-card.module.js';
import { NotificationPreferenceService } from './notification-preference.service.js';
import { NotificationPreferenceController } from './notification-preference.controller.js';
import { NotificationService } from './notification.service.js';
import { NotificationController } from './notification.controller.js';
import { NotificationQueryService } from './notification-query.service.js';
import { NotificationQueryController } from './notification-query.controller.js';
import { FamilyPanelService } from './family-panel.service.js';
import { FamilyPanelController } from './family-panel.controller.js';

// Depende de IdentityAccessModule (UC-FAM-01: guardian_link) y de PlayerCardModule (UC-FAM-01:
// "resumen del jugador" — se reutiliza la Player Card entera, nunca se reconstruye) — nunca lee
// sus tablas directo, siempre vía los servicios exportados.
@Module({
  imports: [AuthModule, IdentityAccessModule, PlayerCardModule],
  controllers: [NotificationPreferenceController, NotificationController, NotificationQueryController, FamilyPanelController],
  providers: [NotificationPreferenceService, NotificationService, NotificationQueryService, FamilyPanelService],
  exports: [NotificationPreferenceService, NotificationService, NotificationQueryService, FamilyPanelService],
})
export class FamilyCommunicationsModule {}
