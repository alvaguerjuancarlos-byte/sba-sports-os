import { describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { CalendarService } from './calendar.service.js';
import { crearDbFalsa } from './test-helpers.js';

const ORG_ID = 'org-1';

function rosterServiceFalso(equiposPorUsuario: Record<string, string[]>) {
  return {
    listarEquiposDeUsuario: vi.fn((_org: string, userId: string) => Promise.resolve(equiposPorUsuario[userId] ?? [])),
  };
}

function guardianServiceFalso(atletasPorTutor: Record<string, string[]>) {
  return {
    listarAtletasDeGuardian: vi.fn((_org: string, guardianId: string) => Promise.resolve(atletasPorTutor[guardianId] ?? [])),
  };
}

function clientConEventosYConteo(eventos: Record<string, unknown>[], miAttendance: Record<string, unknown>[] = [], conteo: Record<string, unknown>[] = []) {
  const query = vi.fn((sql: string) => {
    if (/select \* from event order by start_at$/i.test(sql)) return Promise.resolve({ rows: eventos });
    if (/select \* from event where team_id = any/i.test(sql)) return Promise.resolve({ rows: eventos });
    if (/select \* from attendance where event_id = \$1 and user_id = \$2/i.test(sql)) return Promise.resolve({ rows: miAttendance });
    if (/select status, count\(\*\)/i.test(sql)) return Promise.resolve({ rows: conteo });
    throw new Error(`Query sin stub configurado: ${sql}`);
  });
  return { query } as unknown as PoolClient;
}

// UC-CAL-04 — "cada rol ve el calendario filtrado a su alcance."
describe('CalendarService', () => {
  it('staff (admin/director) ve todos los eventos de la organización, con conteo agregado', async () => {
    const evento = { id: 'event-1', start_at: '2026-08-01T18:00:00Z' };
    const conteo = [{ status: 'confirmed', total: '3' }, { status: 'pending', total: '1' }];
    const client = clientConEventosYConteo([evento], [], conteo);
    const db = crearDbFalsa(client);
    const service = new CalendarService(db as never, rosterServiceFalso({}) as never, guardianServiceFalso({}) as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: 'admin-1', actorRoles: ['admin'] });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].confirmados).toBe(3);
    expect(resultado[0].pendientes).toBe(1);
    expect(resultado[0].declinados).toBe(0);
  });

  it('coach solo ve los eventos de los equipos donde tiene membresía activa de coach, con conteo', async () => {
    const roster = rosterServiceFalso({ 'coach-1': ['team-A'] });
    const evento = { id: 'event-1' };
    const client = clientConEventosYConteo([evento], [], []);
    const db = crearDbFalsa(client);
    const service = new CalendarService(db as never, roster as never, guardianServiceFalso({}) as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: 'coach-1', actorRoles: ['coach'] });

    expect(roster.listarEquiposDeUsuario).toHaveBeenCalledWith(ORG_ID, 'coach-1', { role: 'coach' });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].confirmados).toBe(0);
  });

  it('familia (parent) ve los eventos agregados de los equipos de todos sus hijos', async () => {
    const guardian = guardianServiceFalso({ 'tutor-1': ['hijo-1', 'hijo-2'] });
    const roster = rosterServiceFalso({ 'hijo-1': ['team-A'], 'hijo-2': ['team-B'] });
    const client = clientConEventosYConteo([{ id: 'event-A' }, { id: 'event-B' }]);
    const db = crearDbFalsa(client);
    const service = new CalendarService(db as never, roster as never, guardian as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: 'tutor-1', actorRoles: ['parent'] });

    expect(guardian.listarAtletasDeGuardian).toHaveBeenCalledWith(ORG_ID, 'tutor-1');
    expect(resultado).toHaveLength(2);
    // player/parent view no incluye conteo agregado
    expect(resultado[0].confirmados).toBeUndefined();
  });

  it('un jugador ve solo los eventos de sus propios equipos, sin conteo agregado, con su propio RSVP', async () => {
    const roster = rosterServiceFalso({ 'jugador-1': ['team-A'] });
    const miAttendance = [{ status: 'confirmed' }];
    const client = clientConEventosYConteo([{ id: 'event-1' }], miAttendance);
    const db = crearDbFalsa(client);
    const service = new CalendarService(db as never, roster as never, guardianServiceFalso({}) as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: 'jugador-1', actorRoles: ['player'] });

    expect(resultado[0].miRsvp).toBe('confirmed');
    expect(resultado[0].confirmados).toBeUndefined();
  });

  it('sin equipos asociados, aun así ve los eventos multi-equipo (team_id null) — nunca se salta esa cláusula', async () => {
    const roster = rosterServiceFalso({});
    const eventoTorneo = { id: 'event-torneo', team_id: null };
    const client = clientConEventosYConteo([eventoTorneo]);
    const db = crearDbFalsa(client);
    const service = new CalendarService(db as never, roster as never, guardianServiceFalso({}) as never);

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: 'jugador-sin-equipo', actorRoles: ['player'] });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('event-torneo');
    const [, params] = (client.query as ReturnType<typeof vi.fn>).mock.calls.find(([sql]: [string]) => /team_id = any/i.test(sql))!;
    expect(params).toEqual([[]]);
  });
});
