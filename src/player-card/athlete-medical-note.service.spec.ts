import { describe, expect, it } from 'vitest';
import { AthleteMedicalNoteService } from './athlete-medical-note.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ADMIN_ID = 'admin-1';
const PLAYER_ID = 'player-1';

describe('AthleteMedicalNoteService', () => {
  it('registra la nota médica y la audita — todo cambio a un dato restringido genera audit_log', async () => {
    const auditLog = crearAuditLogFalso();
    const stubs: QueryStub[] = [{ matcher: /insert into athlete_medical_note/i, rows: [{ id: 'amn-1', player_id: PLAYER_ID, note_type: 'allergy' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new AthleteMedicalNoteService(db as never, auditLog as never);

    const resultado = await service.registrar({ organizationId: ORG_ID, actorUserId: ADMIN_ID, playerId: PLAYER_ID, noteType: 'allergy', description: 'alergia a maní' });

    expect(resultado.note_type).toBe('allergy');
    expect(auditLog.record).toHaveBeenCalledOnce();
  });

  it('lista solo notas activas de un jugador', async () => {
    const stubs: QueryStub[] = [{ matcher: /select \* from athlete_medical_note where player_id = \$1 and active = true/i, rows: [{ id: 'amn-1' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new AthleteMedicalNoteService(db as never, crearAuditLogFalso() as never);

    await expect(service.listarPorJugador(ORG_ID, PLAYER_ID)).resolves.toHaveLength(1);
  });
});
