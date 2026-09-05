import { describe, expect, it } from 'vitest';
import { AthleteNutritionNoteService } from './athlete-nutrition-note.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ADMIN_ID = 'admin-1';
const PLAYER_ID = 'player-1';

describe('AthleteNutritionNoteService', () => {
  it('registra la nota nutricional y la audita', async () => {
    const auditLog = crearAuditLogFalso();
    const stubs: QueryStub[] = [{ matcher: /insert into athlete_nutrition_note/i, rows: [{ id: 'ann-1', player_id: PLAYER_ID }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new AthleteNutritionNoteService(db as never, auditLog as never);

    const resultado = await service.registrar({ organizationId: ORG_ID, actorUserId: ADMIN_ID, playerId: PLAYER_ID, note: 'plan alto en proteína' });

    expect(resultado.player_id).toBe(PLAYER_ID);
    expect(auditLog.record).toHaveBeenCalledOnce();
  });
});
