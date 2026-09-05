import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { PerformanceAssessmentRow } from './performance.types.js';

export interface RegistrarEvaluacionInput {
  organizationId: string;
  actorUserId: string; // coach
  playerId: string;
  assessmentDate: string;
  category: string;
  score: number;
  notes?: string | null;
}

// Capturador mínimo de performance_assessment — ver nota de alcance en la migración
// 0012_performance_init.sql: ningún UC de este documento define la pantalla de captura, pero
// UC-PRF-01 la lista como fuente de agregación real, no hipotética.
@Injectable()
export class PerformanceAssessmentService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async registrar(input: RegistrarEvaluacionInput): Promise<PerformanceAssessmentRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<PerformanceAssessmentRow>(
        `insert into performance_assessment (organization_id, player_id, coach_id, assessment_date, category, score, notes)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning *`,
        [input.organizationId, input.playerId, input.actorUserId, input.assessmentDate, input.category, input.score, input.notes ?? null],
      );
      const evaluacion = rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'performance_assessment',
        entityId: evaluacion.id,
        newValue: { playerId: evaluacion.player_id, category: evaluacion.category, score: evaluacion.score },
      });

      return evaluacion;
    });
  }

  // Lectura para consumidores de otros dominios (DevelopmentMapService, UC-PRF-01) — así ese
  // servicio nunca hace SELECT directo contra esta tabla.
  async listarPorJugadorEnRango(organizationId: string, playerId: string, desde: string, hasta: string): Promise<PerformanceAssessmentRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<PerformanceAssessmentRow>(
        `select * from performance_assessment where player_id = $1 and assessment_date between $2 and $3 order by assessment_date`,
        [playerId, desde, hasta],
      );
      return rows;
    });
  }

  // Lectura para consumidores de otros dominios (ej. Player Card, UC-PLC-01: sección de
  // performance — historial completo, no un rango de fechas).
  async listarPorJugador(organizationId: string, playerId: string): Promise<PerformanceAssessmentRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<PerformanceAssessmentRow>(`select * from performance_assessment where player_id = $1 order by assessment_date desc`, [playerId]);
      return rows;
    });
  }
}
