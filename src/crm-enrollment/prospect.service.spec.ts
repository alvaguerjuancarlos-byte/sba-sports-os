import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProspectService } from './prospect.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'staff-1';
const PROSPECT_ID = 'prospect-1';

// UC-CRM-01 — un test por criterio de aceptación textual.
describe('ProspectService', () => {
  it('crea el prospect en stage=lead y lo audita', async () => {
    const auditLog = crearAuditLogFalso();
    const stubs: QueryStub[] = [{ matcher: /insert into prospect/i, rows: [{ id: PROSPECT_ID, name: 'Juan', stage: 'lead' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new ProspectService(db as never, auditLog as never);

    const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, name: 'Juan', contactInfo: 'juan@x.com', source: 'referido' });

    expect(resultado.stage).toBe('lead');
    expect(auditLog.record).toHaveBeenCalledOnce();
  });

  describe('cambiarStage', () => {
    it('lanza NotFoundException si el prospect no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from prospect where id/i, rows: [] }]));
      const service = new ProspectService(db as never, crearAuditLogFalso() as never);

      await expect(service.cambiarStage({ organizationId: ORG_ID, actorUserId: ACTOR_ID, prospectId: 'no-existe', stage: 'trial' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('3a: permite saltar de lead directo a won sin pasar por trial/negotiation', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from prospect where id/i, rows: [{ id: PROSPECT_ID, stage: 'lead' }] },
        { matcher: /update prospect set stage/i, rows: [{ id: PROSPECT_ID, stage: 'won' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new ProspectService(db as never, crearAuditLogFalso() as never);

      await expect(service.cambiarStage({ organizationId: ORG_ID, actorUserId: ACTOR_ID, prospectId: PROSPECT_ID, stage: 'won' })).resolves.toMatchObject({
        stage: 'won',
      });
    });

    it('3b: un cambio a lost audita el cambio con fecha, sin borrar el registro', async () => {
      const auditLog = crearAuditLogFalso();
      const stubs: QueryStub[] = [
        { matcher: /select \* from prospect where id/i, rows: [{ id: PROSPECT_ID, stage: 'negotiation' }] },
        { matcher: /update prospect set stage/i, rows: [{ id: PROSPECT_ID, stage: 'lost' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new ProspectService(db as never, auditLog as never);

      await service.cambiarStage({ organizationId: ORG_ID, actorUserId: ACTOR_ID, prospectId: PROSPECT_ID, stage: 'lost' });

      expect(auditLog.record).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ fieldChanged: 'stage', newValue: { stage: 'lost' } }),
      );
      const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /^delete/i.test(sql.trim()));
      expect(llamadasDelete).toHaveLength(0);
    });
  });

  describe('marcarConvertido', () => {
    it('marca stage=won y converted_at, y audita', async () => {
      const auditLog = crearAuditLogFalso();
      const stubs: QueryStub[] = [{ matcher: /update prospect set stage = 'won'/i, rows: [{ id: PROSPECT_ID, stage: 'won', converted_at: '2026-01-01' }] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new ProspectService(db as never, auditLog as never);

      const resultado = await service.marcarConvertido(ORG_ID, ACTOR_ID, PROSPECT_ID);

      expect(resultado.converted_at).toBeTruthy();
      expect(auditLog.record).toHaveBeenCalledOnce();
    });
  });
});
