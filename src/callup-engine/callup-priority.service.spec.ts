import { describe, expect, it, vi } from 'vitest';
import { CallupPriorityService } from './callup-priority.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const LIST_ID = 'list-1';
const TEAM_ID = 'team-1';

function rosterServiceFalso(roster: Record<string, unknown>[]) {
  return { listarPorEquipo: vi.fn().mockResolvedValue(roster) };
}

function checkinServiceFalso(conteos: Record<string, number>) {
  return { contarCheckinsDesde: vi.fn((_org: string, userId: string) => Promise.resolve(conteos[userId] ?? 0)) };
}

function eventServiceFalso(event: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(event) };
}

// UC-CUP-03 — un test por criterio de aceptación textual.
describe('CallupPriorityService', () => {
  describe('calcularYAsignar', () => {
    it('sin alternos, no hace nada', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from callup_slot where callup_list_id/i, rows: [] }]));
      const checkin = checkinServiceFalso({});
      const service = new CallupPriorityService(db as never, rosterServiceFalso([]) as never, checkin as never, eventServiceFalso(null) as never);

      await service.calcularYAsignar(ORG_ID, LIST_ID, TEAM_ID, 28);

      expect(checkin.contarCheckinsDesde).not.toHaveBeenCalled();
    });

    it('calcula y persiste priority_score para cada alterno según su asistencia reciente', async () => {
      const alternos = [{ id: 'slot-a', user_id: 'jugador-a' }, { id: 'slot-b', user_id: 'jugador-b' }];
      const stubs: QueryStub[] = [
        { matcher: /select \* from callup_slot where callup_list_id/i, rows: alternos },
        { matcher: /update callup_slot set priority_score/i, rows: [] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const checkin = checkinServiceFalso({ 'jugador-a': 3, 'jugador-b': 5 });
      const service = new CallupPriorityService(db as never, rosterServiceFalso([]) as never, checkin as never, eventServiceFalso(null) as never);

      await service.calcularYAsignar(ORG_ID, LIST_ID, TEAM_ID, 28);

      const llamadas = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /update callup_slot set priority_score/i.test(sql));
      expect(llamadas).toHaveLength(2);
      expect(llamadas.find((c) => c[1][0] === 'slot-a')?.[1]).toEqual(['slot-a', 3]);
      expect(llamadas.find((c) => c[1][0] === 'slot-b')?.[1]).toEqual(['slot-b', 5]);
    });
  });

  describe('promoverSiguienteAlterno', () => {
    it('sin alternos disponibles, regresa null (5a) — el cupo queda vacío, nunca se fuerza', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from callup_slot where callup_list_id/i, rows: [] }]));
      const service = new CallupPriorityService(db as never, rosterServiceFalso([]) as never, checkinServiceFalso({}) as never, eventServiceFalso(null) as never);

      await expect(service.promoverSiguienteAlterno(ORG_ID, LIST_ID)).resolves.toBeNull();
    });

    it('promueve al alterno con mayor priority_score', async () => {
      const alternos = [
        { id: 'slot-a', user_id: 'jugador-a', priority_score: '2', created_at: '2026-01-01' },
        { id: 'slot-b', user_id: 'jugador-b', priority_score: '5', created_at: '2026-01-01' },
      ];
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string, params: unknown[] = []) => {
        if (/select \* from callup_slot where callup_list_id = \$1 and status = 'alternate'/i.test(sql)) return Promise.resolve({ rows: alternos });
        if (/select event_id from callup_list/i.test(sql)) return Promise.resolve({ rows: [{ event_id: 'event-1' }] });
        if (/update callup_slot set status = 'called'/i.test(sql)) {
          const userId = params[1];
          const promovido = alternos.find((a) => a.user_id === userId);
          return Promise.resolve({ rows: promovido ? [{ ...promovido, status: 'called' }] : [] });
        }
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new CallupPriorityService(
        db as never,
        rosterServiceFalso([]) as never,
        checkinServiceFalso({}) as never,
        eventServiceFalso({ id: 'event-1', team_id: TEAM_ID }) as never,
      );

      const resultado = await service.promoverSiguienteAlterno(ORG_ID, LIST_ID);

      expect(resultado?.user_id).toBe('jugador-b');
    });

    it('en caso de empate de priority_score, desempata por antigüedad de roster (el más antiguo gana)', async () => {
      const alternos = [
        { id: 'slot-a', user_id: 'jugador-a', priority_score: '3', created_at: '2026-06-01' },
        { id: 'slot-b', user_id: 'jugador-b', priority_score: '3', created_at: '2026-06-01' },
      ];
      const roster = [
        { user_id: 'jugador-a', created_at: '2026-01-01' }, // más antiguo
        { user_id: 'jugador-b', created_at: '2026-05-01' },
      ];
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string, params: unknown[] = []) => {
        if (/select \* from callup_slot where callup_list_id = \$1 and status = 'alternate'/i.test(sql)) return Promise.resolve({ rows: alternos });
        if (/select event_id from callup_list/i.test(sql)) return Promise.resolve({ rows: [{ event_id: 'event-1' }] });
        if (/update callup_slot set status = 'called'/i.test(sql)) {
          const userId = params[1];
          const promovido = alternos.find((a) => a.user_id === userId);
          return Promise.resolve({ rows: promovido ? [{ ...promovido, status: 'called' }] : [] });
        }
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new CallupPriorityService(
        db as never,
        rosterServiceFalso(roster) as never,
        checkinServiceFalso({}) as never,
        eventServiceFalso({ id: 'event-1', team_id: TEAM_ID }) as never,
      );

      const resultado = await service.promoverSiguienteAlterno(ORG_ID, LIST_ID);

      expect(resultado?.user_id).toBe('jugador-a');
    });
  });
});
