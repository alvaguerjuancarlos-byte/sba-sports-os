import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventService } from './event.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'coach-1';
const TEAM_ID = 'team-1';
const VENUE_ID = 'venue-1';

function rosterServiceFalso(roster: Record<string, unknown>[]) {
  return { listarPorEquipo: vi.fn().mockResolvedValue(roster) };
}

// UC-CAL-01 / UC-CAL-02 — un test por criterio de aceptación textual.
describe('EventService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  it('rechaza end_at anterior o igual a start_at', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new EventService(db as never, auditLog as never, rosterServiceFalso([]) as never);

    await expect(
      service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['coach'], type: 'training', venueId: VENUE_ID, startAt: '2026-08-01T18:00:00Z', endAt: '2026-08-01T18:00:00Z' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sin conflicto de horario, crea el evento y genera RSVP para todo el roster activo en la misma operación', async () => {
    const roster = [{ user_id: 'jugador-1' }, { user_id: 'jugador-2' }];
    const stubs: QueryStub[] = [
      { matcher: /select \* from event where venue_id/i, rows: [] },
      { matcher: /insert into event/i, rows: [{ id: 'event-1', team_id: TEAM_ID, venue_id: VENUE_ID, status: 'scheduled' }] },
      { matcher: /insert into attendance/i, rows: [{ id: 'att-x', status: 'pending' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new EventService(db as never, auditLog as never, rosterServiceFalso(roster) as never);

    const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['coach'], type: 'training', teamId: TEAM_ID, venueId: VENUE_ID, startAt: '2026-08-01T18:00:00Z', endAt: '2026-08-01T19:00:00Z' });

    expect(resultado.event.status).toBe('scheduled');
    expect(resultado.invitacionesGeneradas).toBe(2);
    expect(auditLog.record).not.toHaveBeenCalled();
  });

  it('evento multi-equipo (sin teamId) no genera RSVP', async () => {
    const stubs: QueryStub[] = [
      { matcher: /select \* from event where venue_id/i, rows: [] },
      { matcher: /insert into event/i, rows: [{ id: 'event-1', team_id: null, venue_id: VENUE_ID, status: 'scheduled' }] },
    ];
    const roster = rosterServiceFalso([]);
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new EventService(db as never, auditLog as never, roster as never);

    const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['admin'], type: 'tournament', venueId: VENUE_ID, startAt: '2026-08-01T18:00:00Z', endAt: '2026-08-01T19:00:00Z' });

    expect(resultado.invitacionesGeneradas).toBe(0);
    expect(roster.listarPorEquipo).not.toHaveBeenCalled();
  });

  it('bloquea la confirmación si hay conflicto de horario sin forzar (UC-CAL-02, paso 2)', async () => {
    const conflicto = { id: 'event-existente', start_at: '2026-08-01T18:00:00Z', end_at: '2026-08-01T19:00:00Z' };
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from event where venue_id/i, rows: [conflicto] }]));
    const service = new EventService(db as never, auditLog as never, rosterServiceFalso([]) as never);

    await expect(
      service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['coach'], type: 'training', venueId: VENUE_ID, startAt: '2026-08-01T18:30:00Z', endAt: '2026-08-01T19:30:00Z' }),
    ).rejects.toThrow(ConflictException);
  });

  it('un coach (sin permiso de excepción) no puede forzar el traslape — ni se le muestra la opción (alt 3a)', async () => {
    const conflicto = { id: 'event-existente', start_at: '2026-08-01T18:00:00Z', end_at: '2026-08-01T19:00:00Z' };
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from event where venue_id/i, rows: [conflicto] }]));
    const service = new EventService(db as never, auditLog as never, rosterServiceFalso([]) as never);

    await expect(
      service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['coach'], type: 'training', venueId: VENUE_ID, startAt: '2026-08-01T18:30:00Z', endAt: '2026-08-01T19:30:00Z', forceOverlap: true }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('un admin (con permiso de excepción) sí puede forzar el traslape, y queda auditado', async () => {
    const conflicto = { id: 'event-existente', start_at: '2026-08-01T18:00:00Z', end_at: '2026-08-01T19:00:00Z' };
    const stubs: QueryStub[] = [
      { matcher: /select \* from event where venue_id/i, rows: [conflicto] },
      { matcher: /insert into event/i, rows: [{ id: 'event-nuevo', team_id: null, venue_id: VENUE_ID, status: 'scheduled' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new EventService(db as never, auditLog as never, rosterServiceFalso([]) as never);

    const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['admin'], type: 'training', venueId: VENUE_ID, startAt: '2026-08-01T18:30:00Z', endAt: '2026-08-01T19:30:00Z', forceOverlap: true });

    expect(resultado.event.id).toBe('event-nuevo');
    expect(resultado.conflictosForzados).toHaveLength(1);
    expect(auditLog.record).toHaveBeenCalledOnce();
  });

  it('requiere que team/venue/league_cup existan — violación de FK se traduce a NotFoundException', async () => {
    const client = crearClientFalso([{ matcher: /select \* from event where venue_id/i, rows: [] }]);
    (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
      if (/select \* from event where venue_id/i.test(sql)) return Promise.resolve({ rows: [] });
      if (/insert into event/i.test(sql)) return Promise.reject(Object.assign(new Error('fk violation'), { code: '23503' }));
      throw new Error(`Query sin stub configurado: ${sql}`);
    });
    const db = crearDbFalsa(client);
    const service = new EventService(db as never, auditLog as never, rosterServiceFalso([]) as never);

    await expect(
      service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['admin'], type: 'training', venueId: 'no-existe', startAt: '2026-08-01T18:00:00Z', endAt: '2026-08-01T19:00:00Z' }),
    ).rejects.toThrow(NotFoundException);
  });
});
