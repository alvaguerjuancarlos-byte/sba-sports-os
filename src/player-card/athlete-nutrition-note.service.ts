import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { AthleteNutritionNoteRow } from './player-card.types.js';

export interface RegistrarNotaNutricionalInput {
  organizationId: string;
  actorUserId: string;
  playerId: string;
  note: string;
}

// UC-PLC-02 — misma lógica que AthleteMedicalNoteService, para athlete_nutrition_note.
@Injectable()
export class AthleteNutritionNoteService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async registrar(input: RegistrarNotaNutricionalInput): Promise<AthleteNutritionNoteRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<AthleteNutritionNoteRow>(
        `insert into athlete_nutrition_note (organization_id, player_id, note, recorded_by)
         values ($1, $2, $3, $4)
         returning *`,
        [input.organizationId, input.playerId, input.note, input.actorUserId],
      );
      const nota = rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'athlete_nutrition_note',
        entityId: nota.id,
        newValue: { playerId: nota.player_id },
      });

      return nota;
    });
  }

  async listarPorJugador(organizationId: string, playerId: string): Promise<AthleteNutritionNoteRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<AthleteNutritionNoteRow>(`select * from athlete_nutrition_note where player_id = $1 order by recorded_at desc`, [playerId]);
      return rows;
    });
  }
}
