import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { MatchQueryService } from './match-query.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const EVENT_ID = 'event-1';

// UC-MAT-04 / UC-MAT-05 — un test por criterio de aceptación textual.
describe('MatchQueryService', () => {
  describe('consultarEnVivo', () => {
    it('lanza NotFoundException si el partido no ha iniciado', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from match_score where event_id/i, rows: [] }]));
      const service = new MatchQueryService(db as never);

      await expect(service.consultarEnVivo(ORG_ID, 'no-existe')).rejects.toThrow(NotFoundException);
    });

    it('regresa el marcador y los eventos en vivo', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from match_score where event_id/i, rows: [{ id: 'score-1', team_score: 1, opponent_score: 0, status: 'live' }] },
        { matcher: /select \* from match_event where event_id/i, rows: [{ id: 'me-1', type: 'goal', minute: 10 }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new MatchQueryService(db as never);

      const resultado = await service.consultarEnVivo(ORG_ID, EVENT_ID);

      expect(resultado.matchScore.team_score).toBe(1);
      expect(resultado.eventos).toHaveLength(1);
    });
  });

  describe('consultarEstadisticasDeJugador', () => {
    it('regresa el historial de player_statistic del jugador', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from player_statistic where user_id/i, rows: [{ id: 'ps-1', minutes_played: 90 }] }]));
      const service = new MatchQueryService(db as never);

      const resultado = await service.consultarEstadisticasDeJugador(ORG_ID, 'jugador-1');

      expect(resultado).toHaveLength(1);
    });
  });

  describe('consultarEstadisticasDePartido', () => {
    it('regresa las estadísticas consolidadas de un partido', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from player_statistic where event_id/i, rows: [{ id: 'ps-1' }, { id: 'ps-2' }] }]));
      const service = new MatchQueryService(db as never);

      const resultado = await service.consultarEstadisticasDePartido(ORG_ID, EVENT_ID);

      expect(resultado).toHaveLength(2);
    });
  });
});
