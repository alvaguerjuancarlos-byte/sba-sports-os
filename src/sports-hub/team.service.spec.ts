import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TeamService } from './team.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';

// UC-SPT-02 — un test por criterio de aceptación textual.
describe('TeamService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('crear', () => {
    it('requiere que la season ya exista — violación de FK se traduce a NotFoundException', async () => {
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/insert into team/i.test(sql)) return Promise.reject(Object.assign(new Error('fk violation'), { code: '23503' }));
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new TeamService(db as never, auditLog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, name: 'Sub-15 A', category: 'Sub-15', sport: 'Futbol', seasonId: 'no-existe' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea el equipo con el deporte fijo a nivel de equipo', async () => {
      const stubs: QueryStub[] = [
        { matcher: /insert into team/i, rows: [{ id: 'team-1', name: 'Sub-15 A', category: 'Sub-15', sport: 'Futbol', season_id: 'season-1', status: 'active' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new TeamService(db as never, auditLog as never);

      const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, name: 'Sub-15 A', category: 'Sub-15', sport: 'Futbol', seasonId: 'season-1' });

      expect(resultado.sport).toBe('Futbol');
      expect(auditLog.record).toHaveBeenCalledOnce();
    });
  });

  describe('archivar', () => {
    it('lanza NotFoundException si no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from team where id/i, rows: [] }]));
      const service = new TeamService(db as never, auditLog as never);

      await expect(service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, teamId: 'no-existe' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('archiva sin borrar', async () => {
      const anterior = { id: 'team-1', status: 'active' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from team where id/i, rows: [anterior] },
        { matcher: /update team set status = 'archived'/i, rows: [{ ...anterior, status: 'archived' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new TeamService(db as never, auditLog as never);

      const resultado = await service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, teamId: 'team-1' });

      expect(resultado.status).toBe('archived');
      const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /delete/i.test(sql));
      expect(llamadasDelete).toHaveLength(0);
    });
  });
});
