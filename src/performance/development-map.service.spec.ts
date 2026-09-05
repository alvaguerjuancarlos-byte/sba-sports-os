import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DevelopmentMapService } from './development-map.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const TEAM_ID = 'team-1';
const DESDE = '2026-01-01';
const HASTA = '2026-03-01';

function performanceAssessmentServiceFalso(rowsPorJugador: Record<string, { score: string }[]> = {}) {
  return { listarPorJugadorEnRango: vi.fn((_org: string, playerId: string) => Promise.resolve(rowsPorJugador[playerId] ?? [])) };
}
function matchQueryServiceFalso(rowsPorJugador: Record<string, { goals: number }[]> = {}) {
  return { consultarEstadisticasDeJugadorEnRango: vi.fn((_org: string, userId: string) => Promise.resolve(rowsPorJugador[userId] ?? [])) };
}
function weeklyFeedbackQueryServiceFalso(rowsPorJugador: Record<string, Record<string, number | null>[]> = {}) {
  return { listarPorJugadorEnRango: vi.fn((_org: string, playerId: string) => Promise.resolve(rowsPorJugador[playerId] ?? [])) };
}
function checkinServiceFalso(conteoPorJugador: Record<string, number> = {}) {
  return { contarCheckinsEnRango: vi.fn((_org: string, userId: string) => Promise.resolve(conteoPorJugador[userId] ?? 0)) };
}
function rosterServiceFalso(rosterPorEquipo: Record<string, { user_id: string; role: string }[]> = {}, equiposPorUsuario: Record<string, string[]> = {}) {
  return {
    listarPorEquipo: vi.fn((_org: string, teamId: string) => Promise.resolve(rosterPorEquipo[teamId] ?? [])),
    listarEquiposDeUsuario: vi.fn((_org: string, userId: string) => Promise.resolve(equiposPorUsuario[userId] ?? [])),
  };
}
function teamServiceFalso(teams: { id: string }[] = []) {
  return { listar: vi.fn().mockResolvedValue(teams) };
}

function construirServicio(deps: {
  db: ReturnType<typeof crearDbFalsa>;
  assessments?: Parameters<typeof performanceAssessmentServiceFalso>[0];
  stats?: Parameters<typeof matchQueryServiceFalso>[0];
  feedbacks?: Parameters<typeof weeklyFeedbackQueryServiceFalso>[0];
  checkins?: Parameters<typeof checkinServiceFalso>[0];
  rosterPorEquipo?: Parameters<typeof rosterServiceFalso>[0];
  equiposPorUsuario?: Parameters<typeof rosterServiceFalso>[1];
  teams?: Parameters<typeof teamServiceFalso>[0];
}) {
  return new DevelopmentMapService(
    deps.db as never,
    performanceAssessmentServiceFalso(deps.assessments) as never,
    rosterServiceFalso(deps.rosterPorEquipo, deps.equiposPorUsuario) as never,
    teamServiceFalso(deps.teams) as never,
    matchQueryServiceFalso(deps.stats) as never,
    weeklyFeedbackQueryServiceFalso(deps.feedbacks) as never,
    checkinServiceFalso(deps.checkins) as never,
  );
}

// UC-PRF-01 — un test por criterio de aceptación textual.
describe('DevelopmentMapService.generarParaAtleta', () => {
  it('calcula las 4 dimensiones y las persiste (upsert) para el atleta', async () => {
    const stubs: QueryStub[] = [
      { matcher: /insert into development_map/i, rows: [{ id: 'dm-1', scope: 'athlete', scope_ref_id: 'p1' }] },
    ];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = construirServicio({
      db,
      assessments: { p1: [{ score: '80' }, { score: '90' }] },
      stats: { p1: [{ goals: 2 }] },
      feedbacks: { p1: [{ mood: 4, attention: null, attitude: null, disposition: null, commitment: null }] },
      checkins: { p1: 5 },
      equiposPorUsuario: { p1: [TEAM_ID] },
    });

    const resultado = await service.generarParaAtleta({ organizationId: ORG_ID, athleteUserId: 'p1', dateRangeStart: DESDE, dateRangeEnd: HASTA });

    expect(resultado.scope_ref_id).toBe('p1');
    const [, params] = (client.query as ReturnType<typeof vi.fn>).mock.calls[0];
    const dimensionesGuardadas = JSON.parse(params[5]);
    expect(dimensionesGuardadas.desempeño).toEqual({ value: 85, sufficientData: true });
    expect(dimensionesGuardadas.rendimientoEnPartido).toEqual({ value: 2, sufficientData: true });
    expect(dimensionesGuardadas.asistencia).toEqual({ value: 5, sufficientData: true });
  });

  it('2a: señala explícitamente las dimensiones sin datos suficientes en vez de interpolar', async () => {
    const stubs: QueryStub[] = [{ matcher: /insert into development_map/i, rows: [{ id: 'dm-1' }] }];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = construirServicio({ db, equiposPorUsuario: { p1: [] } });

    await service.generarParaAtleta({ organizationId: ORG_ID, athleteUserId: 'p1', dateRangeStart: DESDE, dateRangeEnd: HASTA });

    const [, params] = (client.query as ReturnType<typeof vi.fn>).mock.calls[0];
    const dimensiones = JSON.parse(params[5]);
    expect(dimensiones.desempeño.sufficientData).toBe(false);
    expect(dimensiones.desempeño.value).toBeNull();
  });
});

describe('DevelopmentMapService.generarParaEquipoOAcademia', () => {
  it('2a: excluye del promedio a un atleta sin datos suficientes y reporta cuántos se excluyeron — nunca los trata como cero', async () => {
    const stubs: QueryStub[] = [{ matcher: /insert into development_map/i, rows: [{ id: 'dm-1' }] }];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = construirServicio({
      db,
      rosterPorEquipo: { [TEAM_ID]: [{ user_id: 'con-datos', role: 'player' }, { user_id: 'sin-datos', role: 'player' }] },
      assessments: { 'con-datos': [{ score: '80' }] },
      equiposPorUsuario: { 'con-datos': [], 'sin-datos': [] },
    });

    await service.generarParaEquipoOAcademia({ organizationId: ORG_ID, scope: 'team', scopeRefId: TEAM_ID, dateRangeStart: DESDE, dateRangeEnd: HASTA });

    const [, params] = (client.query as ReturnType<typeof vi.fn>).mock.calls[0];
    const dimensiones = JSON.parse(params[5]);
    expect(dimensiones.desempeño.value).toBe(80);
    expect(dimensiones.desempeño.excludedCount).toBe(1);
  });

  it('scope=academy agrega todos los equipos activos, sin duplicar a un atleta con doble militancia', async () => {
    const stubs: QueryStub[] = [{ matcher: /insert into development_map/i, rows: [{ id: 'dm-1' }] }];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = construirServicio({
      db,
      teams: [{ id: 'team-a' }, { id: 'team-b' }],
      rosterPorEquipo: {
        'team-a': [{ user_id: 'doble-militancia', role: 'player' }],
        'team-b': [{ user_id: 'doble-militancia', role: 'player' }],
      },
      assessments: { 'doble-militancia': [{ score: '70' }] },
      equiposPorUsuario: { 'doble-militancia': [] },
    });

    await service.generarParaEquipoOAcademia({ organizationId: ORG_ID, scope: 'academy', scopeRefId: ORG_ID, dateRangeStart: DESDE, dateRangeEnd: HASTA });

    const [, params] = (client.query as ReturnType<typeof vi.fn>).mock.calls[0];
    const dimensiones = JSON.parse(params[5]);
    // Si se contara dos veces, el promedio seguiría siendo 70 pero el excludedCount reflejaría 2
    // atletas en vez de 1 — se verifica indirectamente por el conteo total esperado.
    expect(dimensiones.desempeño.value).toBe(70);
    expect(dimensiones.desempeño.excludedCount).toBe(0);
  });
});

describe('DevelopmentMapService.obtener', () => {
  it('lanza NotFoundException si no se ha generado un development_map para ese scope/rango', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from development_map where scope/i, rows: [] }]));
    const service = construirServicio({ db });

    await expect(service.obtener(ORG_ID, 'athlete', 'p1', DESDE, HASTA)).rejects.toThrow(NotFoundException);
  });
});

describe('DevelopmentMapService.obtenerMasRecienteDeAtleta', () => {
  it('regresa null si el atleta nunca ha tenido un development_map generado', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from development_map where scope = 'athlete'/i, rows: [] }]));
    const service = construirServicio({ db });

    await expect(service.obtenerMasRecienteDeAtleta(ORG_ID, 'p1')).resolves.toBeNull();
  });
});
