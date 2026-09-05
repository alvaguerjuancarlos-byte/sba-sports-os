import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { GuardianConsentService } from '../identity-access/guardian-consent.service.js';
import type { WeeklyFeedbackRow } from './weekly-coach-feedback.types.js';

export interface ConsultarHistoricoInput {
  organizationId: string;
  actorUserId: string;
  actorRoles: string[];
  playerId: string;
  desde?: string;
  hasta?: string;
}

// UC-WCF-02 — Consultar histórico de feedback semanal (condensado). Es además el insumo directo
// de los Development Maps (Performance, sección 4 del documento fuente) — ver
// PerformanceModule.DevelopmentMapService, que consume consultarHistorico() en vez de leer
// weekly_feedback directo.
@Injectable()
export class WeeklyFeedbackQueryService {
  constructor(
    private readonly db: DatabaseService,
    private readonly guardianConsentService: GuardianConsentService,
  ) {}

  async consultarHistorico(input: ConsultarHistoricoInput): Promise<WeeklyFeedbackRow[]> {
    await this.verificarAcceso(input);

    return this.db.withTenant(input.organizationId, async (client) => {
      if (input.desde && input.hasta) {
        const { rows } = await client.query<WeeklyFeedbackRow>(
          `select * from weekly_feedback where player_id = $1 and week_ending between $2 and $3 order by week_ending`,
          [input.playerId, input.desde, input.hasta],
        );
        return rows;
      }
      const { rows } = await client.query<WeeklyFeedbackRow>(
        `select * from weekly_feedback where player_id = $1 order by week_ending`,
        [input.playerId],
      );
      return rows;
    });
  }

  private async verificarAcceso(input: ConsultarHistoricoInput): Promise<void> {
    const esStaff = input.actorRoles.some((role) => role === 'admin' || role === 'director' || role === 'coach');
    if (esStaff) return;

    const esPropio = input.actorUserId === input.playerId;
    if (esPropio) return;

    const esGuardian = await this.guardianConsentService.esGuardianDe(input.organizationId, input.actorUserId, input.playerId);
    if (esGuardian) return;

    throw new ForbiddenException('No tienes scope para consultar el histórico de feedback de este atleta.');
  }
}
