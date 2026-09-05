import { describe, expect, it } from 'vitest';
import { PerformanceAssessmentService } from './performance-assessment.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const COACH_ID = 'coach-1';
const PLAYER_ID = 'player-1';

describe('PerformanceAssessmentService', () => {
  it('registra la evaluación y la audita', async () => {
    const auditLog = crearAuditLogFalso();
    const stubs: QueryStub[] = [
      { matcher: /insert into performance_assessment/i, rows: [{ id: 'pa-1', player_id: PLAYER_ID, category: 'técnica', score: '85' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new PerformanceAssessmentService(db as never, auditLog as never);

    const resultado = await service.registrar({ organizationId: ORG_ID, actorUserId: COACH_ID, playerId: PLAYER_ID, assessmentDate: '2026-09-01', category: 'técnica', score: 85 });

    expect(resultado.category).toBe('técnica');
    expect(auditLog.record).toHaveBeenCalledOnce();
  });

  it('lista evaluaciones de un jugador dentro de un rango de fechas', async () => {
    const stubs: QueryStub[] = [{ matcher: /select \* from performance_assessment where player_id = \$1 and assessment_date between/i, rows: [{ id: 'pa-1' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new PerformanceAssessmentService(db as never, crearAuditLogFalso() as never);

    const resultado = await service.listarPorJugadorEnRango(ORG_ID, PLAYER_ID, '2026-01-01', '2026-03-01');

    expect(resultado).toHaveLength(1);
  });

  it('lista todas las evaluaciones de un jugador', async () => {
    const stubs: QueryStub[] = [{ matcher: /select \* from performance_assessment where player_id = \$1 order by assessment_date/i, rows: [{ id: 'pa-1' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new PerformanceAssessmentService(db as never, crearAuditLogFalso() as never);

    const resultado = await service.listarPorJugador(ORG_ID, PLAYER_ID);

    expect(resultado).toHaveLength(1);
  });
});
