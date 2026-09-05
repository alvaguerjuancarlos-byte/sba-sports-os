import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { MatchLineupService } from './match-lineup.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'coach-1';
const EVENT_ID = 'event-1';

function eventServiceFalso(event: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(event) };
}
function callupListServiceFalso(slot: Record<string, unknown> | null) {
  return { obtenerSlotConfirmado: vi.fn().mockResolvedValue(slot) };
}

// UC-MAT-01 — un test por criterio de aceptación textual.
describe('MatchLineupService', () => {
  describe('asignarAlineacion', () => {
    it('lanza NotFoundException si el event no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new MatchLineupService(db as never, eventServiceFalso(null) as never, callupListServiceFalso(null) as never);

      await expect(
        service.asignarAlineacion({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: 'no-existe', titulares: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('bloquea alinear a un jugador que no está confirmado en la convocatoria (3a)', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new MatchLineupService(db as never, eventServiceFalso({ id: EVENT_ID }) as never, callupListServiceFalso(null) as never);

      await expect(
        service.asignarAlineacion({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          eventId: EVENT_ID,
          titulares: [{ callupSlotId: 'slot-no-confirmado', position: 'Delantero', formationSlot: '9' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea un match_lineup por cada titular confirmado', async () => {
      const stubs: QueryStub[] = [{ matcher: /insert into match_lineup/i, rows: [{ id: 'lineup-1', is_starter: true, is_active: true }] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const callupList = callupListServiceFalso({ id: 'slot-1', user_id: 'jugador-1', status: 'accepted' });
      const service = new MatchLineupService(db as never, eventServiceFalso({ id: EVENT_ID }) as never, callupList as never);

      const resultado = await service.asignarAlineacion({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        eventId: EVENT_ID,
        titulares: [{ callupSlotId: 'slot-1', position: 'Delantero', formationSlot: '9' }],
      });

      expect(resultado).toHaveLength(1);
      expect(resultado[0].is_starter).toBe(true);
    });

    it('no permite alinear dos veces al mismo callup_slot en el mismo evento', async () => {
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/insert into match_lineup/i.test(sql)) return Promise.reject(Object.assign(new Error('duplicate'), { code: '23505' }));
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const callupList = callupListServiceFalso({ id: 'slot-1', user_id: 'jugador-1', status: 'accepted' });
      const service = new MatchLineupService(db as never, eventServiceFalso({ id: EVENT_ID }) as never, callupList as never);

      await expect(
        service.asignarAlineacion({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          eventId: EVENT_ID,
          titulares: [{ callupSlotId: 'slot-1', position: 'Delantero', formationSlot: '9' }],
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('iniciarPartido', () => {
    it('no permite iniciar el mismo partido dos veces', async () => {
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/insert into match_score/i.test(sql)) return Promise.reject(Object.assign(new Error('duplicate'), { code: '23505' }));
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new MatchLineupService(db as never, eventServiceFalso(null) as never, callupListServiceFalso(null) as never);

      await expect(service.iniciarPartido({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID })).rejects.toThrow(
        ConflictException,
      );
    });

    it('crea match_score en 0-0 con status=live en la misma operación de creación', async () => {
      const stubs: QueryStub[] = [
        { matcher: /insert into match_score/i, rows: [{ id: 'score-1', team_score: 0, opponent_score: 0, status: 'live' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new MatchLineupService(db as never, eventServiceFalso(null) as never, callupListServiceFalso(null) as never);

      const resultado = await service.iniciarPartido({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID });

      expect(resultado.status).toBe('live');
      expect(resultado.team_score).toBe(0);
      expect(resultado.opponent_score).toBe(0);
    });
  });

  describe('listarPorEvento', () => {
    it('regresa los match_lineup del evento', async () => {
      const stubs: QueryStub[] = [{ matcher: /select \* from match_lineup where event_id/i, rows: [{ id: 'lineup-1' }] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new MatchLineupService(db as never, eventServiceFalso(null) as never, callupListServiceFalso(null) as never);

      const resultado = await service.listarPorEvento(ORG_ID, EVENT_ID);

      expect(resultado).toHaveLength(1);
    });
  });
});
