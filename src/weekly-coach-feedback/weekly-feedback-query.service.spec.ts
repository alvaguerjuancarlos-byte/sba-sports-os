import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { WeeklyFeedbackQueryService } from './weekly-feedback-query.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const PLAYER_ID = 'player-1';

function guardianServiceFalso(esGuardian: boolean) {
  return { esGuardianDe: vi.fn().mockResolvedValue(esGuardian) };
}

// UC-WCF-02 — un test por criterio de aceptación textual.
describe('WeeklyFeedbackQueryService', () => {
  it('permite a staff (admin/director/coach) consultar el histórico de cualquier atleta', async () => {
    const stubs: QueryStub[] = [{ matcher: /select \* from weekly_feedback where player_id = \$1 order/i, rows: [{ id: 'wf-1' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new WeeklyFeedbackQueryService(db as never, guardianServiceFalso(false) as never);

    const resultado = await service.consultarHistorico({ organizationId: ORG_ID, actorUserId: 'coach-1', actorRoles: ['coach'], playerId: PLAYER_ID });

    expect(resultado).toHaveLength(1);
  });

  it('permite a un jugador consultar su propio histórico', async () => {
    const stubs: QueryStub[] = [{ matcher: /select \* from weekly_feedback where player_id = \$1 order/i, rows: [{ id: 'wf-1' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new WeeklyFeedbackQueryService(db as never, guardianServiceFalso(false) as never);

    await expect(
      service.consultarHistorico({ organizationId: ORG_ID, actorUserId: PLAYER_ID, actorRoles: ['player'], playerId: PLAYER_ID }),
    ).resolves.toHaveLength(1);
  });

  it('permite al tutor (guardian_link vigente) consultar el histórico de su hijo', async () => {
    const stubs: QueryStub[] = [{ matcher: /select \* from weekly_feedback where player_id = \$1 order/i, rows: [{ id: 'wf-1' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new WeeklyFeedbackQueryService(db as never, guardianServiceFalso(true) as never);

    await expect(
      service.consultarHistorico({ organizationId: ORG_ID, actorUserId: 'tutor-1', actorRoles: ['parent'], playerId: PLAYER_ID }),
    ).resolves.toHaveLength(1);
  });

  it('rechaza a quien no es staff, no es el propio jugador, ni tutor vigente', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new WeeklyFeedbackQueryService(db as never, guardianServiceFalso(false) as never);

    await expect(
      service.consultarHistorico({ organizationId: ORG_ID, actorUserId: 'extraño-1', actorRoles: ['parent'], playerId: PLAYER_ID }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('filtra por rango de fechas cuando se especifica desde/hasta', async () => {
    const stubs: QueryStub[] = [{ matcher: /select \* from weekly_feedback where player_id = \$1 and week_ending between/i, rows: [{ id: 'wf-1' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new WeeklyFeedbackQueryService(db as never, guardianServiceFalso(false) as never);

    await expect(
      service.consultarHistorico({ organizationId: ORG_ID, actorUserId: 'coach-1', actorRoles: ['coach'], playerId: PLAYER_ID, desde: '2026-01-01', hasta: '2026-03-01' }),
    ).resolves.toHaveLength(1);
  });
});
