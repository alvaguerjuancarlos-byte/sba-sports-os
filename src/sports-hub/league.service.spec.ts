import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeagueService } from './league.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';

// UC-SPT-04 / UC-SPT-05 — un test por criterio de aceptación textual.
describe('LeagueService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('crear', () => {
    it('requiere al menos un equipo participante', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new LeagueService(db as never, auditLog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, seasonId: 'season-1', name: 'Liga Sub-15', format: 'liga_tabla', teamIds: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requiere que la season exista', async () => {
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/insert into league_cup/i.test(sql)) return Promise.reject(Object.assign(new Error('fk violation'), { code: '23503' }));
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new LeagueService(db as never, auditLog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, seasonId: 'no-existe', name: 'Liga Sub-15', format: 'liga_tabla', teamIds: ['team-1'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea la tabla de posiciones desde la creación, una fila en cero por cada equipo', async () => {
      const stubs: QueryStub[] = [
        { matcher: /insert into league_cup/i, rows: [{ id: 'cup-1', season_id: 'season-1', name: 'Liga Sub-15', format: 'liga_tabla' }] },
        { matcher: /insert into league_standing/i, rows: [{ id: 'standing-1', league_cup_id: 'cup-1', team_id: 'team-1', points: 0, wins: 0, draws: 0, losses: 0 }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new LeagueService(db as never, auditLog as never);

      const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, seasonId: 'season-1', name: 'Liga Sub-15', format: 'liga_tabla', teamIds: ['team-1'] });

      expect(resultado.standings).toHaveLength(1);
      expect(resultado.standings[0].points).toBe(0);
      expect(auditLog.record).toHaveBeenCalledOnce();
    });

    it('requiere que cada team participante exista', async () => {
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/insert into league_cup/i.test(sql)) return Promise.resolve({ rows: [{ id: 'cup-1' }] });
        if (/insert into league_standing/i.test(sql)) return Promise.reject(Object.assign(new Error('fk violation'), { code: '23503' }));
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new LeagueService(db as never, auditLog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, seasonId: 'season-1', name: 'Liga Sub-15', format: 'liga_tabla', teamIds: ['no-existe'] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('consultarHistorial', () => {
    it('lanza NotFoundException si el league_cup no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from league_cup where id/i, rows: [] }]));
      const service = new LeagueService(db as never, auditLog as never);

      await expect(service.consultarHistorial(ORG_ID, 'no-existe')).rejects.toThrow(NotFoundException);
    });

    it('regresa el league_cup y su tabla de posiciones', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from league_cup where id/i, rows: [{ id: 'cup-1', name: 'Liga Sub-15' }] },
        { matcher: /select \* from league_standing where league_cup_id/i, rows: [{ id: 'standing-1', points: 3 }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new LeagueService(db as never, auditLog as never);

      const resultado = await service.consultarHistorial(ORG_ID, 'cup-1');

      expect(resultado.leagueCup.name).toBe('Liga Sub-15');
      expect(resultado.standings).toHaveLength(1);
    });
  });

  describe('listar', () => {
    it('regresa los league_cup de la organización', async () => {
      const stubs: QueryStub[] = [{ matcher: /select \* from league_cup order by created_at desc/i, rows: [{ id: 'cup-1' }] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new LeagueService(db as never, auditLog as never);

      const resultado = await service.listar(ORG_ID);

      expect(resultado).toHaveLength(1);
    });
  });
});
