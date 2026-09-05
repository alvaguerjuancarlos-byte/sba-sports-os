import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { AthleteMedicalNoteRow, AthleteMedicalNoteType } from './player-card.types.js';

export interface RegistrarNotaMedicaInput {
  organizationId: string;
  actorUserId: string;
  playerId: string;
  noteType: AthleteMedicalNoteType;
  description: string;
}

// UC-PLC-02 — "cambio a la entidad de origen correspondiente (athlete_medical_note)". Escritura
// restringida a admin/director en el controller — ver nota de alcance en player-card.module.ts:
// "coach/staff con scope médico autorizado" (UC-PLC-02, literal) no tiene una entidad que modele
// ese scope hoy, así que se trata de forma conservadora como admin/director únicamente.
@Injectable()
export class AthleteMedicalNoteService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async registrar(input: RegistrarNotaMedicaInput): Promise<AthleteMedicalNoteRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<AthleteMedicalNoteRow>(
        `insert into athlete_medical_note (organization_id, player_id, note_type, description, recorded_by)
         values ($1, $2, $3, $4, $5)
         returning *`,
        [input.organizationId, input.playerId, input.noteType, input.description, input.actorUserId],
      );
      const nota = rows[0];

      // Criterio de aceptación UC-PLC-02: "todo cambio a una sección restringida genera una
      // entrada de audit_log con el campo modificado, quién lo hizo y cuándo" — sin excepción por
      // tratarse de dato sensible.
      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'athlete_medical_note',
        entityId: nota.id,
        newValue: { playerId: nota.player_id, noteType: nota.note_type },
      });

      return nota;
    });
  }

  // Lectura para PlayerCardQueryService (UC-PLC-01, sección médica) — así ese servicio nunca hace
  // SELECT directo contra esta tabla.
  async listarPorJugador(organizationId: string, playerId: string): Promise<AthleteMedicalNoteRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<AthleteMedicalNoteRow>(
        `select * from athlete_medical_note where player_id = $1 and active = true order by recorded_at desc`,
        [playerId],
      );
      return rows;
    });
  }
}
