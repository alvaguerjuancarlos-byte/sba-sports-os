import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard, Roles } from '../auth/roles.guard.js';
import { MfaRequiredGuard } from '../auth/mfa-required.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/jwt.types.js';
import { AthleteMedicalNoteService } from './athlete-medical-note.service.js';
import { AthleteNutritionNoteService } from './athlete-nutrition-note.service.js';
import type { AthleteMedicalNoteType } from './player-card.types.js';

// UC-PLC-02 — Actualizar datos médicos/nutricionales. Restringido a admin/director — ver nota de
// alcance en athlete-medical-note.service.ts ("coach con scope médico autorizado" no tiene una
// entidad que lo modele hoy).
@Controller('player-card/athletes/:athleteId')
@UseGuards(JwtAuthGuard, RolesGuard, MfaRequiredGuard)
@Roles('admin', 'director')
export class PlayerCardWriteController {
  constructor(
    private readonly medicalNoteService: AthleteMedicalNoteService,
    private readonly nutritionNoteService: AthleteNutritionNoteService,
  ) {}

  @Post('medical-notes')
  registrarNotaMedica(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('athleteId') athleteId: string,
    @Body() body: { noteType: AthleteMedicalNoteType; description: string },
  ) {
    return this.medicalNoteService.registrar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      playerId: athleteId,
      noteType: body.noteType,
      description: body.description,
    });
  }

  @Post('nutrition-notes')
  registrarNotaNutricional(@CurrentUser() actor: AuthenticatedUser, @Param('athleteId') athleteId: string, @Body() body: { note: string }) {
    return this.nutritionNoteService.registrar({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      playerId: athleteId,
      note: body.note,
    });
  }
}
