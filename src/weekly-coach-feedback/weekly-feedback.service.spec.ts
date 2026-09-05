import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { WeeklyFeedbackService } from './weekly-feedback.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const COACH_ID = 'coach-1';
const TEAM_ID = 'team-1';

function teamServiceFalso(team: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(team) };
}
function rosterServiceFalso(roster: Record<string, unknown>[]) {
  return { listarPorEquipo: vi.fn().mockResolvedValue(roster) };
}

const jugador = (id: string) => ({ user_id: id, role: 'player', status: 'active' });

// UC-WCF-01 — un test por criterio de aceptación textual.
describe('WeeklyFeedbackService', () => {
  it('lanza NotFoundException si el team no existe', async () => {
    const auditLog = crearAuditLogFalso();
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new WeeklyFeedbackService(db as never, auditLog as never, teamServiceFalso(null) as never, rosterServiceFalso([]) as never);

    await expect(
      service.capturarLote({ organizationId: ORG_ID, actorUserId: COACH_ID, teamId: 'no-existe', weekEnding: '2026-09-06', entradas: [] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('marca como error (no lanza) la entrada de un jugador fuera del roster activo, y continúa con el resto (2a)', async () => {
    const stubs: QueryStub[] = [
      { matcher: /insert into weekly_feedback/i, rows: [{ id: 'wf-1', player_id: 'p-en-roster', week_ending: '2026-09-06' }] },
    ];
    const auditLog = crearAuditLogFalso();
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new WeeklyFeedbackService(
      db as never,
      auditLog as never,
      teamServiceFalso({ id: TEAM_ID }) as never,
      rosterServiceFalso([jugador('p-en-roster')]) as never,
    );

    const resultados = await service.capturarLote({
      organizationId: ORG_ID,
      actorUserId: COACH_ID,
      teamId: TEAM_ID,
      weekEnding: '2026-09-06',
      entradas: [{ playerId: 'p-en-roster', mood: 4 }, { playerId: 'p-fuera-de-roster', mood: 3 }],
    });

    expect(resultados.find((r) => r.playerId === 'p-en-roster')?.ok).toBe(true);
    expect(resultados.find((r) => r.playerId === 'p-fuera-de-roster')?.ok).toBe(false);
  });

  it('ningún campo obligatorio de un jugador bloquea el guardado del resto del lote — un error de BD en una fila no afecta a otras', async () => {
    const client = crearClientFalso([]);
    (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string, params: unknown[] = []) => {
      if (/insert into weekly_feedback/i.test(sql)) {
        if (params[2] === 'p-falla') return Promise.reject(new Error('constraint violado'));
        return Promise.resolve({ rows: [{ id: 'wf-ok', player_id: params[2], week_ending: params[4] }] });
      }
      throw new Error(`Query sin stub configurado: ${sql}`);
    });
    const auditLog = crearAuditLogFalso();
    const db = crearDbFalsa(client);
    const service = new WeeklyFeedbackService(
      db as never,
      auditLog as never,
      teamServiceFalso({ id: TEAM_ID }) as never,
      rosterServiceFalso([jugador('p-falla'), jugador('p-ok')]) as never,
    );

    const resultados = await service.capturarLote({
      organizationId: ORG_ID,
      actorUserId: COACH_ID,
      teamId: TEAM_ID,
      weekEnding: '2026-09-06',
      entradas: [{ playerId: 'p-falla', mood: 99 }, { playerId: 'p-ok', mood: 4 }],
    });

    expect(resultados.find((r) => r.playerId === 'p-falla')?.ok).toBe(false);
    expect(resultados.find((r) => r.playerId === 'p-ok')?.ok).toBe(true);
  });

  it('guarda el lote capturando mood/attention/attitude/disposition/commitment/dna + 3 preguntas + nota/voz, y audita', async () => {
    const stubs: QueryStub[] = [
      { matcher: /insert into weekly_feedback/i, rows: [{ id: 'wf-1', player_id: 'p1', week_ending: '2026-09-06' }] },
    ];
    const auditLog = crearAuditLogFalso();
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new WeeklyFeedbackService(
      db as never,
      auditLog as never,
      teamServiceFalso({ id: TEAM_ID }) as never,
      rosterServiceFalso([jugador('p1')]) as never,
    );

    const resultados = await service.capturarLote({
      organizationId: ORG_ID,
      actorUserId: COACH_ID,
      teamId: TEAM_ID,
      weekEnding: '2026-09-06',
      entradas: [
        {
          playerId: 'p1',
          mood: 5,
          attention: 4,
          attitude: 5,
          disposition: 4,
          commitment: 5,
          dna: 'competitivo',
          sportQuestion1: 'a',
          sportQuestion2: 'b',
          sportQuestion3: 'c',
          note: 'buena semana',
          voiceUrl: 'https://audio/x.mp3',
        },
      ],
    });

    expect(resultados[0].ok).toBe(true);
    expect(auditLog.record).toHaveBeenCalledOnce();
  });

  it('re-capturar la misma semana con menos campos no borra lo ya guardado — el upsert es un merge, no un reemplazo total (coalesce)', async () => {
    const auditLog = crearAuditLogFalso();
    const client = crearClientFalso([]);
    (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
      if (/on conflict \(player_id, week_ending\) do update set/i.test(sql)) {
        expect(sql).toMatch(/mood = coalesce\(excluded\.mood, weekly_feedback\.mood\)/i);
        expect(sql).toMatch(/note = coalesce\(excluded\.note, weekly_feedback\.note\)/i);
        return Promise.resolve({ rows: [{ id: 'wf-1', player_id: 'p1', mood: 5, note: 'corrección' }] });
      }
      throw new Error(`Query sin stub configurado: ${sql}`);
    });
    const db = crearDbFalsa(client);
    const service = new WeeklyFeedbackService(
      db as never,
      auditLog as never,
      teamServiceFalso({ id: TEAM_ID }) as never,
      rosterServiceFalso([jugador('p1')]) as never,
    );

    await service.capturarLote({ organizationId: ORG_ID, actorUserId: COACH_ID, teamId: TEAM_ID, weekEnding: '2026-09-06', entradas: [{ playerId: 'p1', note: 'corrección' }] });
  });
});
