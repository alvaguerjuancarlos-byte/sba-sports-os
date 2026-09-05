import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RosterService } from './roster.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'coach-1';
const TEAM_ID = 'team-1';
const USER_ID = 'user-1';

const equipo = { id: TEAM_ID, sport: 'Futbol', season_id: 'season-1' };

function usersServiceFalso(tieneRolActivo: boolean) {
  return { tieneRolActivoEnOrganizacion: vi.fn().mockResolvedValue(tieneRolActivo) };
}

function teamServiceFalso(team: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(team) };
}

// UC-SPT-03 — un test por criterio de aceptación textual.
describe('RosterService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('crear', () => {
    it('lanza NotFoundException si el team no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new RosterService(db as never, auditLog as never, usersServiceFalso(true) as never, teamServiceFalso(null) as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, teamId: 'no-existe', userId: USER_ID, role: 'player' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('bloquea el alta si la persona no tiene rol activo en la organización (2a)', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new RosterService(db as never, auditLog as never, usersServiceFalso(false) as never, teamServiceFalso(equipo) as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, teamId: TEAM_ID, userId: USER_ID, role: 'player' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('alerta (409) por doble militancia en el mismo deporte y temporada sin confirmación explícita (3a)', async () => {
      const otraMembresia = { id: 'rm-otra', team_id: 'otro-team', user_id: USER_ID, status: 'active' };
      const db = crearDbFalsa(crearClientFalso([{ matcher: /join team t on t\.id = rm\.team_id/i, rows: [otraMembresia] }]));
      const service = new RosterService(db as never, auditLog as never, usersServiceFalso(true) as never, teamServiceFalso(equipo) as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, teamId: TEAM_ID, userId: USER_ID, role: 'player' }),
      ).rejects.toThrow(ConflictException);
    });

    it('con confirmDualMembership=true, permite la doble militancia', async () => {
      const stubs: QueryStub[] = [
        { matcher: /insert into roster_membership/i, rows: [{ id: 'rm-1', team_id: TEAM_ID, user_id: USER_ID, role: 'player', status: 'active' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new RosterService(db as never, auditLog as never, usersServiceFalso(true) as never, teamServiceFalso(equipo) as never);

      const resultado = await service.crear({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        teamId: TEAM_ID,
        userId: USER_ID,
        role: 'player',
        confirmDualMembership: true,
      });

      expect(resultado.status).toBe('active');
    });

    it('ningún roster_membership existe sin user_tenant_role activo — nunca inserta si tieneRolActivo es false', async () => {
      const client = crearClientFalso([]);
      const db = crearDbFalsa(client);
      const service = new RosterService(db as never, auditLog as never, usersServiceFalso(false) as never, teamServiceFalso(equipo) as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, teamId: TEAM_ID, userId: USER_ID, role: 'player' }),
      ).rejects.toThrow(BadRequestException);
      expect(db.withTenant).not.toHaveBeenCalled();
    });

    it('crea la membresía y la audita', async () => {
      const stubs: QueryStub[] = [
        { matcher: /join team t on t\.id = rm\.team_id/i, rows: [] },
        { matcher: /insert into roster_membership/i, rows: [{ id: 'rm-1', team_id: TEAM_ID, user_id: USER_ID, role: 'player', status: 'active' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new RosterService(db as never, auditLog as never, usersServiceFalso(true) as never, teamServiceFalso(equipo) as never);

      await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, teamId: TEAM_ID, userId: USER_ID, role: 'player' });

      expect(auditLog.record).toHaveBeenCalledOnce();
    });
  });

  describe('desactivar', () => {
    it('lanza NotFoundException si no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from roster_membership where id/i, rows: [] }]));
      const service = new RosterService(db as never, auditLog as never, usersServiceFalso(true) as never, teamServiceFalso(null) as never);

      await expect(
        service.desactivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, rosterMembershipId: 'no-existe' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('desactiva sin borrar — preserva el histórico', async () => {
      const anterior = { id: 'rm-1', status: 'active' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from roster_membership where id/i, rows: [anterior] },
        { matcher: /update roster_membership set status = 'inactive'/i, rows: [{ ...anterior, status: 'inactive' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new RosterService(db as never, auditLog as never, usersServiceFalso(true) as never, teamServiceFalso(null) as never);

      const resultado = await service.desactivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, rosterMembershipId: 'rm-1' });

      expect(resultado.status).toBe('inactive');
      const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /delete/i.test(sql));
      expect(llamadasDelete).toHaveLength(0);
    });
  });

  describe('listarEquiposDeUsuario', () => {
    it('regresa los ids de equipo activos de un usuario, filtrando por rol si se pide', async () => {
      const db = crearDbFalsa(
        crearClientFalso([{ matcher: /select distinct team_id from roster_membership where user_id = \$1 and status = 'active' and role/i, rows: [{ team_id: 'team-A' }] }]),
      );
      const service = new RosterService(db as never, auditLog as never, usersServiceFalso(true) as never, teamServiceFalso(null) as never);

      await expect(service.listarEquiposDeUsuario(ORG_ID, USER_ID, { role: 'coach' })).resolves.toEqual(['team-A']);
    });

    it('sin filtro de rol, regresa todos los equipos activos del usuario — usado por Calendar & RSVP (UC-CAL-04)', async () => {
      const db = crearDbFalsa(
        crearClientFalso([{ matcher: /select distinct team_id from roster_membership where user_id = \$1 and status = 'active'$/i, rows: [{ team_id: 'team-A' }, { team_id: 'team-B' }] }]),
      );
      const service = new RosterService(db as never, auditLog as never, usersServiceFalso(true) as never, teamServiceFalso(null) as never);

      await expect(service.listarEquiposDeUsuario(ORG_ID, USER_ID)).resolves.toEqual(['team-A', 'team-B']);
    });
  });
});
