import { describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MatchClosingService } from './match-closing.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'coach-1';
const EVENT_ID = 'event-1';

function eventServiceFalso(event: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(event) };
}

// UC-MAT-03 — un test por criterio de aceptación textual.
describe('MatchClosingService', () => {
  it('lanza NotFoundException si el event no existe', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new MatchClosingService(db as never, eventServiceFalso(null) as never);

    await expect(service.cerrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: 'no-existe', finalMinute: 90 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lanza NotFoundException si el partido no ha iniciado', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from match_score where event_id/i, rows: [] }]));
    const service = new MatchClosingService(db as never, eventServiceFalso({ id: EVENT_ID, league_cup_id: null, team_id: 'team-1' }) as never);

    await expect(service.cerrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, finalMinute: 90 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza cerrar un partido que ya está cerrado', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from match_score where event_id/i, rows: [{ id: 'score-1', status: 'final' }] }]));
    const service = new MatchClosingService(db as never, eventServiceFalso({ id: EVENT_ID, league_cup_id: null, team_id: 'team-1' }) as never);

    await expect(service.cerrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, finalMinute: 90 })).rejects.toThrow(
      ConflictException,
    );
  });

  it('consolida player_statistic aunque no haya ni un solo match_event', async () => {
    const stubs: QueryStub[] = [
      { matcher: /select \* from match_score where event_id/i, rows: [{ id: 'score-1', status: 'live', team_score: 0, opponent_score: 0 }] },
      { matcher: /update match_score set status = 'final'/i, rows: [{ id: 'score-1', status: 'final', team_score: 0, opponent_score: 0 }] },
      { matcher: /select \* from match_lineup where event_id/i, rows: [{ id: 'lineup-1', user_id: 'jugador-1', is_starter: true }] },
      { matcher: /select \* from match_event where event_id/i, rows: [] },
      { matcher: /insert into player_statistic/i, rows: [{ id: 'ps-1', user_id: 'jugador-1', minutes_played: 90, goals: 0, cards: 0 }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new MatchClosingService(db as never, eventServiceFalso({ id: EVENT_ID, league_cup_id: null, team_id: 'team-1' }) as never);

    const resultado = await service.cerrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, finalMinute: 90 });

    expect(resultado.estadisticas).toHaveLength(1);
    expect(resultado.estadisticas[0].minutes_played).toBe(90);
    expect(resultado.standingActualizado).toBe(false);
  });

  it('un partido amistoso (sin league_cup) omite la actualización de standings, pero sí consolida estadísticas', async () => {
    const stubs: QueryStub[] = [
      { matcher: /select \* from match_score where event_id/i, rows: [{ id: 'score-1', status: 'live', team_score: 2, opponent_score: 1 }] },
      { matcher: /update match_score set status = 'final'/i, rows: [{ id: 'score-1', status: 'final', team_score: 2, opponent_score: 1 }] },
      { matcher: /select \* from match_lineup where event_id/i, rows: [] },
      { matcher: /select \* from match_event where event_id/i, rows: [] },
    ];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = new MatchClosingService(db as never, eventServiceFalso({ id: EVENT_ID, league_cup_id: null, team_id: 'team-1' }) as never);

    const resultado = await service.cerrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, finalMinute: 90 });

    expect(resultado.standingActualizado).toBe(false);
    const llamadaStanding = (client.query as ReturnType<typeof vi.fn>).mock.calls.find(([sql]: [string]) => /update league_standing/i.test(sql));
    expect(llamadaStanding).toBeUndefined();
  });

  it('un partido de league_cup actualiza league_standing según el resultado (victoria = 3 puntos)', async () => {
    const stubs: QueryStub[] = [
      { matcher: /select \* from match_score where event_id/i, rows: [{ id: 'score-1', status: 'live', team_score: 3, opponent_score: 1 }] },
      { matcher: /update match_score set status = 'final'/i, rows: [{ id: 'score-1', status: 'final', team_score: 3, opponent_score: 1 }] },
      { matcher: /select \* from match_lineup where event_id/i, rows: [] },
      { matcher: /select \* from match_event where event_id/i, rows: [] },
      { matcher: /update league_standing/i, rows: [] },
    ];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = new MatchClosingService(db as never, eventServiceFalso({ id: EVENT_ID, league_cup_id: 'cup-1', team_id: 'team-1' }) as never);

    const resultado = await service.cerrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, finalMinute: 90 });

    expect(resultado.standingActualizado).toBe(true);
    const [, params] = (client.query as ReturnType<typeof vi.fn>).mock.calls.find(([sql]: [string]) => /update league_standing/i.test(sql))!;
    expect(params).toEqual(['cup-1', 'team-1', 3, 1, 0, 0]);
  });
});
