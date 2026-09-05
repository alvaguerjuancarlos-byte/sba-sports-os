import { beforeEach, describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SeasonService } from './season.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';

// UC-SPT-01 — un test por criterio de aceptación textual.
describe('SeasonService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('crear', () => {
    it('rechaza end_date anterior a start_date', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new SeasonService(db as never, auditLog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, name: '2026-2027', startDate: '2026-08-01', endDate: '2026-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sin temporadas activas que se solapen, crea sin avisos', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from season where status = 'active'/i, rows: [] },
        { matcher: /insert into season/i, rows: [{ id: 'season-1', name: '2026-2027', start_date: '2026-08-01', end_date: '2027-06-30', status: 'active' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new SeasonService(db as never, auditLog as never);

      const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, name: '2026-2027', startDate: '2026-08-01', endDate: '2027-06-30' });

      expect(resultado.solapamientos).toHaveLength(0);
      expect(auditLog.record).toHaveBeenCalledOnce();
    });

    it('crea la temporada AUNQUE se solape con otra activa — es un aviso, no un bloqueo', async () => {
      const existente = { id: 'season-existente', name: 'Verano 2026', start_date: '2026-06-01', end_date: '2026-08-31', status: 'active' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from season where status = 'active'/i, rows: [existente] },
        { matcher: /insert into season/i, rows: [{ id: 'season-nueva', name: '2026-2027', start_date: '2026-08-01', end_date: '2027-06-30', status: 'active' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new SeasonService(db as never, auditLog as never);

      const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, name: '2026-2027', startDate: '2026-08-01', endDate: '2027-06-30' });

      expect(resultado.season.id).toBe('season-nueva');
      expect(resultado.solapamientos).toHaveLength(1);
      expect(resultado.solapamientos[0].id).toBe('season-existente');
    });
  });

  describe('cerrar', () => {
    it('lanza NotFoundException si no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from season where id/i, rows: [] }]));
      const service = new SeasonService(db as never, auditLog as never);

      await expect(service.cerrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, seasonId: 'no-existe' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('cierra sin borrar', async () => {
      const anterior = { id: 'season-1', status: 'active' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from season where id/i, rows: [anterior] },
        { matcher: /update season set status = 'closed'/i, rows: [{ ...anterior, status: 'closed' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new SeasonService(db as never, auditLog as never);

      const resultado = await service.cerrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, seasonId: 'season-1' });

      expect(resultado.status).toBe('closed');
    });
  });
});
