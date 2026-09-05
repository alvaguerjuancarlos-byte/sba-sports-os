import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MatchEventService } from './match-event.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'coach-1';
const EVENT_ID = 'event-1';
const LINEUP_ID = 'lineup-1';

function callupListServiceFalso(slot: Record<string, unknown> | null) {
  return { obtenerSlotConfirmado: vi.fn().mockResolvedValue(slot) };
}

// UC-MAT-02 — un test por criterio de aceptación textual.
describe('MatchEventService', () => {
  describe('registrar', () => {
    it('rechaza un minuto negativo', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new MatchEventService(db as never, callupListServiceFalso(null) as never);

      await expect(
        service.registrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, type: 'goal', minute: -1, playerLineupId: LINEUP_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('una sustitución requiere el callup_slot del jugador que entra', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new MatchEventService(db as never, callupListServiceFalso(null) as never);

      await expect(
        service.registrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, type: 'substitution', minute: 60, playerLineupId: LINEUP_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si el partido todavía no ha iniciado', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from match_score where event_id/i, rows: [] }]));
      const service = new MatchEventService(db as never, callupListServiceFalso(null) as never);

      await expect(
        service.registrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, type: 'goal', minute: 10, playerLineupId: LINEUP_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza registrar eventos en un partido que ya no está en vivo', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from match_score where event_id/i, rows: [{ id: 'score-1', status: 'final' }] }]));
      const service = new MatchEventService(db as never, callupListServiceFalso(null) as never);

      await expect(
        service.registrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, type: 'goal', minute: 10, playerLineupId: LINEUP_ID }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza capturar un evento para un jugador fuera del match_lineup activo (1a)', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from match_score where event_id/i, rows: [{ id: 'score-1', status: 'live' }] },
        { matcher: /select \* from match_lineup where id = \$1 and event_id = \$2 and is_active/i, rows: [] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new MatchEventService(db as never, callupListServiceFalso(null) as never);

      await expect(
        service.registrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, type: 'card', minute: 30, playerLineupId: LINEUP_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('un gol actualiza team_score en la misma operación', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from match_score where event_id/i, rows: [{ id: 'score-1', status: 'live' }] },
        { matcher: /select \* from match_lineup where id = \$1 and event_id = \$2 and is_active/i, rows: [{ id: LINEUP_ID, is_active: true }] },
        { matcher: /insert into match_event/i, rows: [{ id: 'me-1', type: 'goal', minute: 10 }] },
        { matcher: /update match_score set team_score/i, rows: [] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new MatchEventService(db as never, callupListServiceFalso(null) as never);

      await service.registrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, type: 'goal', minute: 10, playerLineupId: LINEUP_ID });

      const llamadaScore = (client.query as ReturnType<typeof vi.fn>).mock.calls.find(([sql]: [string]) => /update match_score set team_score/i.test(sql));
      expect(llamadaScore).toBeDefined();
    });

    it('una tarjeta no modifica el marcador', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from match_score where event_id/i, rows: [{ id: 'score-1', status: 'live' }] },
        { matcher: /select \* from match_lineup where id = \$1 and event_id = \$2 and is_active/i, rows: [{ id: LINEUP_ID, is_active: true }] },
        { matcher: /insert into match_event/i, rows: [{ id: 'me-1', type: 'card', minute: 30, card_color: 'yellow' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new MatchEventService(db as never, callupListServiceFalso(null) as never);

      await service.registrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, type: 'card', minute: 30, playerLineupId: LINEUP_ID, cardColor: 'yellow' });

      const llamadaScore = (client.query as ReturnType<typeof vi.fn>).mock.calls.find(([sql]: [string]) => /update match_score/i.test(sql));
      expect(llamadaScore).toBeUndefined();
    });

    it('una sustitución rechaza si el entrante no tiene un callup_slot confirmado', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from match_score where event_id/i, rows: [{ id: 'score-1', status: 'live' }] },
        { matcher: /select \* from match_lineup where id = \$1 and event_id = \$2 and is_active/i, rows: [{ id: LINEUP_ID, is_active: true }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new MatchEventService(db as never, callupListServiceFalso(null) as never);

      await expect(
        service.registrar({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          eventId: EVENT_ID,
          type: 'substitution',
          minute: 60,
          playerLineupId: LINEUP_ID,
          substituteCallupSlotId: 'slot-no-confirmado',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('una sustitución crea el match_lineup del entrante y desactiva al saliente', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from match_score where event_id/i, rows: [{ id: 'score-1', status: 'live' }] },
        { matcher: /select \* from match_lineup where id = \$1 and event_id = \$2 and is_active/i, rows: [{ id: LINEUP_ID, is_active: true }] },
        { matcher: /insert into match_lineup/i, rows: [{ id: 'lineup-2', is_starter: false, is_active: true }] },
        { matcher: /update match_lineup set is_active = false/i, rows: [] },
        { matcher: /insert into match_event/i, rows: [{ id: 'me-1', type: 'substitution', substitute_lineup_id: 'lineup-2' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const callupList = callupListServiceFalso({ id: 'slot-2', user_id: 'jugador-2', status: 'accepted' });
      const service = new MatchEventService(db as never, callupList as never);

      const resultado = await service.registrar({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        eventId: EVENT_ID,
        type: 'substitution',
        minute: 60,
        playerLineupId: LINEUP_ID,
        substituteCallupSlotId: 'slot-2',
        substitutePosition: 'Mediocampista',
        substituteFormationSlot: '8',
      });

      expect(resultado.substitute_lineup_id).toBe('lineup-2');
      const llamadaDesactiva = (client.query as ReturnType<typeof vi.fn>).mock.calls.find(([sql]: [string]) => /update match_lineup set is_active = false/i.test(sql));
      expect(llamadaDesactiva).toBeDefined();
    });
  });

  describe('actualizarMarcadorRival', () => {
    it('rechaza un marcador negativo', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new MatchEventService(db as never, callupListServiceFalso(null) as never);

      await expect(
        service.actualizarMarcadorRival({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, opponentScore: -1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('actualiza el marcador del rival si el partido está en vivo', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from match_score where event_id/i, rows: [{ id: 'score-1', status: 'live' }] },
        { matcher: /update match_score set opponent_score/i, rows: [{ id: 'score-1', opponent_score: 2, status: 'live' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new MatchEventService(db as never, callupListServiceFalso(null) as never);

      const resultado = await service.actualizarMarcadorRival({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, opponentScore: 2 });

      expect(resultado.opponent_score).toBe(2);
    });
  });
});
