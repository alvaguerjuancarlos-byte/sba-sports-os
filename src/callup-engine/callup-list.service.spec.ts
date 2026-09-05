import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CallupListService } from './callup-list.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'coach-1';
const EVENT_ID = 'event-1';
const TEAM_ID = 'team-1';

function eventServiceFalso(event: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(event) };
}
function teamServiceFalso(team: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(team) };
}
function rosterServiceFalso(roster: Record<string, unknown>[]) {
  return { listarPorEquipo: vi.fn().mockResolvedValue(roster) };
}
function eligibilityServiceFalso(bloqueados: Set<string>) {
  return {
    consultar: vi.fn(({ athleteUserId }: { athleteUserId: string }) => Promise.resolve({ eligible: !bloqueados.has(athleteUserId) })),
  };
}
function callupFormatRuleServiceFalso(rule: Record<string, unknown> | null) {
  return { obtenerActivaPara: vi.fn().mockResolvedValue(rule) };
}
function callupPriorityServiceFalso() {
  return { calcularYAsignar: vi.fn().mockResolvedValue(undefined) };
}

const jugador = (id: string) => ({ user_id: id, role: 'player' });

// UC-CUP-01 — un test por criterio de aceptación textual.
describe('CallupListService', () => {
  it('lanza NotFoundException si el event no existe', async () => {
    const auditLog = crearAuditLogFalso();
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new CallupListService(
      db as never,
      auditLog as never,
      eventServiceFalso(null) as never,
      teamServiceFalso(null) as never,
      rosterServiceFalso([]) as never,
      eligibilityServiceFalso(new Set()) as never,
      callupFormatRuleServiceFalso(null) as never,
      callupPriorityServiceFalso() as never,
    );

    await expect(service.generar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: 'no-existe', format: 'Fut7' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza generar convocatoria para un evento multi-equipo (sin team_id)', async () => {
    const auditLog = crearAuditLogFalso();
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new CallupListService(
      db as never,
      auditLog as never,
      eventServiceFalso({ id: EVENT_ID, team_id: null }) as never,
      teamServiceFalso(null) as never,
      rosterServiceFalso([]) as never,
      eligibilityServiceFalso(new Set()) as never,
      callupFormatRuleServiceFalso(null) as never,
      callupPriorityServiceFalso() as never,
    );

    await expect(service.generar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, format: 'Fut7' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lanza NotFoundException si no existe una callup_format_rule activa para el deporte/formato', async () => {
    const auditLog = crearAuditLogFalso();
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new CallupListService(
      db as never,
      auditLog as never,
      eventServiceFalso({ id: EVENT_ID, team_id: TEAM_ID }) as never,
      teamServiceFalso({ id: TEAM_ID, sport: 'Futbol' }) as never,
      rosterServiceFalso([]) as never,
      eligibilityServiceFalso(new Set()) as never,
      callupFormatRuleServiceFalso(null) as never,
      callupPriorityServiceFalso() as never,
    );

    await expect(service.generar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, format: 'Fut9' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('excluye a jugadores bloqueados financieramente de convocados Y de alternos (3a)', async () => {
    const roster = [jugador('bloqueado'), jugador('elegible-1')];
    const stubs: QueryStub[] = [
      { matcher: /insert into callup_list/i, rows: [{ id: 'list-1', event_id: EVENT_ID }] },
      { matcher: /insert into callup_slot/i, rows: [{ id: 'slot-1', user_id: 'elegible-1', status: 'called' }] },
    ];
    const auditLog = crearAuditLogFalso();
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new CallupListService(
      db as never,
      auditLog as never,
      eventServiceFalso({ id: EVENT_ID, team_id: TEAM_ID }) as never,
      teamServiceFalso({ id: TEAM_ID, sport: 'Futbol' }) as never,
      rosterServiceFalso(roster) as never,
      eligibilityServiceFalso(new Set(['bloqueado'])) as never,
      callupFormatRuleServiceFalso({ id: 'rule-1', max_players: 12, priority_window_days: 28 }) as never,
      callupPriorityServiceFalso() as never,
    );

    const resultado = await service.generar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, format: 'Fut7' });

    expect(resultado.slots).toHaveLength(1);
    expect(resultado.slots[0].user_id).toBe('elegible-1');
  });

  it('si el roster elegible es menor al máximo del formato, convoca a todos sin forzar el cupo (4a)', async () => {
    const roster = [jugador('a'), jugador('b')];
    const stubs: QueryStub[] = [
      { matcher: /insert into callup_list/i, rows: [{ id: 'list-1', event_id: EVENT_ID }] },
      { matcher: /insert into callup_slot/i, rows: [{ id: 'slot-x', status: 'called' }] },
    ];
    const auditLog = crearAuditLogFalso();
    const db = crearDbFalsa(crearClientFalso(stubs));
    const priority = callupPriorityServiceFalso();
    const service = new CallupListService(
      db as never,
      auditLog as never,
      eventServiceFalso({ id: EVENT_ID, team_id: TEAM_ID }) as never,
      teamServiceFalso({ id: TEAM_ID, sport: 'Futbol' }) as never,
      rosterServiceFalso(roster) as never,
      eligibilityServiceFalso(new Set()) as never,
      callupFormatRuleServiceFalso({ id: 'rule-1', max_players: 12, priority_window_days: 28 }) as never,
      priority as never,
    );

    const resultado = await service.generar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, format: 'Fut7' });

    expect(resultado.slots).toHaveLength(2);
    // Sin sobrantes, no hay alternos que priorizar.
    expect(priority.calcularYAsignar).not.toHaveBeenCalled();
  });

  it('el número de convocados nunca excede callup_format_rule.max_players; el resto pasa a alternos', async () => {
    const roster = [jugador('a'), jugador('b'), jugador('c')];
    let llamadosCreados = 0;
    let alternosCreados = 0;
    const client = crearClientFalso([]);
    (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string, params: unknown[] = []) => {
      if (/insert into callup_list/i.test(sql)) return Promise.resolve({ rows: [{ id: 'list-1', event_id: EVENT_ID }] });
      if (/insert into callup_slot.*'called'/is.test(sql)) {
        llamadosCreados++;
        return Promise.resolve({ rows: [{ id: `slot-called-${llamadosCreados}`, user_id: params[2], status: 'called' }] });
      }
      if (/insert into callup_slot.*'alternate'/is.test(sql)) {
        alternosCreados++;
        return Promise.resolve({ rows: [{ id: `slot-alt-${alternosCreados}`, user_id: params[2], status: 'alternate' }] });
      }
      throw new Error(`Query sin stub configurado: ${sql}`);
    });
    const auditLog = crearAuditLogFalso();
    const db = crearDbFalsa(client);
    const priority = callupPriorityServiceFalso();
    const service = new CallupListService(
      db as never,
      auditLog as never,
      eventServiceFalso({ id: EVENT_ID, team_id: TEAM_ID }) as never,
      teamServiceFalso({ id: TEAM_ID, sport: 'Futbol' }) as never,
      rosterServiceFalso(roster) as never,
      eligibilityServiceFalso(new Set()) as never,
      callupFormatRuleServiceFalso({ id: 'rule-1', max_players: 2, priority_window_days: 28 }) as never,
      priority as never,
    );

    await service.generar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, format: 'Fut7' });

    expect(llamadosCreados).toBe(2);
    expect(alternosCreados).toBe(1);
    expect(priority.calcularYAsignar).toHaveBeenCalledOnce();
  });

  it('no permite generar dos convocatorias para el mismo evento', async () => {
    const client = crearClientFalso([]);
    (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
      if (/insert into callup_list/i.test(sql)) return Promise.reject(Object.assign(new Error('duplicate'), { code: '23505' }));
      throw new Error(`Query sin stub configurado: ${sql}`);
    });
    const auditLog = crearAuditLogFalso();
    const db = crearDbFalsa(client);
    const service = new CallupListService(
      db as never,
      auditLog as never,
      eventServiceFalso({ id: EVENT_ID, team_id: TEAM_ID }) as never,
      teamServiceFalso({ id: TEAM_ID, sport: 'Futbol' }) as never,
      rosterServiceFalso([]) as never,
      eligibilityServiceFalso(new Set()) as never,
      callupFormatRuleServiceFalso({ id: 'rule-1', max_players: 12, priority_window_days: 28 }) as never,
      callupPriorityServiceFalso() as never,
    );

    await expect(service.generar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, format: 'Fut7' })).rejects.toThrow(
      ConflictException,
    );
  });

  describe('obtenerSlotConfirmado', () => {
    it('regresa null si el slot no existe, no pertenece a ese evento, o no está aceptado — usado por Match Center (UC-MAT-01)', async () => {
      const auditLog = crearAuditLogFalso();
      const db = crearDbFalsa(crearClientFalso([{ matcher: /join callup_list cl on cl\.id = cs\.callup_list_id/i, rows: [] }]));
      const service = new CallupListService(
        db as never,
        auditLog as never,
        eventServiceFalso(null) as never,
        teamServiceFalso(null) as never,
        rosterServiceFalso([]) as never,
        eligibilityServiceFalso(new Set()) as never,
        callupFormatRuleServiceFalso(null) as never,
        callupPriorityServiceFalso() as never,
      );

      await expect(service.obtenerSlotConfirmado(ORG_ID, EVENT_ID, 'slot-no-confirmado')).resolves.toBeNull();
    });

    it('regresa el slot si está aceptado y pertenece a la convocatoria de ese evento', async () => {
      const auditLog = crearAuditLogFalso();
      const db = crearDbFalsa(crearClientFalso([{ matcher: /join callup_list cl on cl\.id = cs\.callup_list_id/i, rows: [{ id: 'slot-1', user_id: 'jugador-1', status: 'accepted' }] }]));
      const service = new CallupListService(
        db as never,
        auditLog as never,
        eventServiceFalso(null) as never,
        teamServiceFalso(null) as never,
        rosterServiceFalso([]) as never,
        eligibilityServiceFalso(new Set()) as never,
        callupFormatRuleServiceFalso(null) as never,
        callupPriorityServiceFalso() as never,
      );

      const resultado = await service.obtenerSlotConfirmado(ORG_ID, EVENT_ID, 'slot-1');

      expect(resultado?.user_id).toBe('jugador-1');
    });
  });
});
