import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { WeeklyFeedbackQuestionConfigRow, WeeklyFeedbackQuestionConfigStatus } from './weekly-coach-feedback.types.js';

export interface CrearPreguntasInput {
  organizationId: string;
  actorUserId: string;
  sport: string;
  question1Label: string;
  question2Label: string;
  question3Label: string;
}

export interface ArchivarPreguntasInput {
  organizationId: string;
  actorUserId: string;
  configId: string;
}

// UC-WCF-01, paso 2 — "3 preguntas específicas del deporte, configurables". Mismo patrón
// archivar-no-editar que CallupFormatRuleService (Fase 4).
@Injectable()
export class WeeklyFeedbackQuestionConfigService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crear(input: CrearPreguntasInput): Promise<WeeklyFeedbackQuestionConfigRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      let config: WeeklyFeedbackQuestionConfigRow;
      try {
        const { rows } = await client.query<WeeklyFeedbackQuestionConfigRow>(
          `insert into weekly_feedback_question_config
            (organization_id, sport, question_1_label, question_2_label, question_3_label, status)
           values ($1, $2, $3, $4, $5, 'active')
           returning *`,
          [input.organizationId, input.sport, input.question1Label, input.question2Label, input.question3Label],
        );
        config = rows[0];
      } catch (e) {
        if (this.esViolacionDeUnicidad(e)) {
          throw new ConflictException(`Ya existe una configuración de preguntas activa para '${input.sport}' — archívala antes de crear otra.`);
        }
        throw e;
      }

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'weekly_feedback_question_config',
        entityId: config.id,
        newValue: { sport: config.sport },
      });

      return config;
    });
  }

  async archivar(input: ArchivarPreguntasInput): Promise<WeeklyFeedbackQuestionConfigRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<WeeklyFeedbackQuestionConfigRow>(
        `select * from weekly_feedback_question_config where id = $1`,
        [input.configId],
      );
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('weekly_feedback_question_config no encontrada.');

      const { rows: updated } = await client.query<WeeklyFeedbackQuestionConfigRow>(
        `update weekly_feedback_question_config set status = 'archived' where id = $1 returning *`,
        [input.configId],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'weekly_feedback_question_config',
        entityId: anterior.id,
        fieldChanged: 'status',
        oldValue: { status: anterior.status },
        newValue: { status: 'archived' },
      });

      return updated[0];
    });
  }

  async listar(organizationId: string, opciones: { status?: WeeklyFeedbackQuestionConfigStatus } = {}): Promise<WeeklyFeedbackQuestionConfigRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      if (opciones.status) {
        const { rows } = await client.query<WeeklyFeedbackQuestionConfigRow>(
          `select * from weekly_feedback_question_config where status = $1 order by sport`,
          [opciones.status],
        );
        return rows;
      }
      const { rows } = await client.query<WeeklyFeedbackQuestionConfigRow>(`select * from weekly_feedback_question_config order by sport`);
      return rows;
    });
  }

  async obtenerActivaPara(organizationId: string, sport: string): Promise<WeeklyFeedbackQuestionConfigRow | null> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<WeeklyFeedbackQuestionConfigRow>(
        `select * from weekly_feedback_question_config where sport = $1 and status = 'active'`,
        [sport],
      );
      return rows[0] ?? null;
    });
  }

  private esViolacionDeUnicidad(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
  }
}
