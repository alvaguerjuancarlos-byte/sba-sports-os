import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PlayerCardQueryService } from './player-card-query.service.js';

const ORG_ID = 'org-1';
const ATHLETE_ID = 'athlete-1';
const TEAM_ID = 'team-1';

function construirServicio(overrides: {
  esGuardian?: boolean;
  equiposDelAtleta?: string[];
  equiposDondeActorEsCoach?: string[];
  balanceLanzaForbidden?: boolean;
} = {}) {
  const usersService = { obtenerPorId: vi.fn().mockResolvedValue({ id: ATHLETE_ID, full_name: 'Atleta' }), listarRolesDeUsuario: vi.fn().mockResolvedValue([]) };
  const guardianConsentService = { esGuardianDe: vi.fn().mockResolvedValue(overrides.esGuardian ?? false) };
  const rosterService = {
    listarEquiposDeUsuario: vi.fn((_org: string, userId: string, opciones?: { role?: string }) => {
      if (userId === ATHLETE_ID) return Promise.resolve(overrides.equiposDelAtleta ?? [TEAM_ID]);
      if (opciones?.role === 'coach') return Promise.resolve(overrides.equiposDondeActorEsCoach ?? []);
      return Promise.resolve([]);
    }),
  };
  const teamService = { obtenerPorId: vi.fn().mockResolvedValue({ id: TEAM_ID, name: 'Equipo' }) };
  const matchQueryService = { consultarEstadisticasDeJugador: vi.fn().mockResolvedValue([]) };
  const developmentMapService = { obtenerMasRecienteDeAtleta: vi.fn().mockResolvedValue(null) };
  const performanceAssessmentService = { listarPorJugador: vi.fn().mockResolvedValue([]) };
  const checkinService = { listarPorUsuario: vi.fn().mockResolvedValue([]) };
  const eventService = { listarPorEquipos: vi.fn().mockResolvedValue([]) };
  const balanceQueryService = {
    consultar: overrides.balanceLanzaForbidden
      ? vi.fn().mockRejectedValue(new ForbiddenException('sin scope'))
      : vi.fn().mockResolvedValue({ saldoActual: 0, invoices: [], transactions: [] }),
  };
  const medicalNoteService = { listarPorJugador: vi.fn().mockResolvedValue([{ id: 'note-1' }]) };
  const nutritionNoteService = { listarPorJugador: vi.fn().mockResolvedValue([{ id: 'note-1' }]) };
  const galleryService = { listar: vi.fn().mockResolvedValue([]) };

  const service = new PlayerCardQueryService(
    usersService as never,
    guardianConsentService as never,
    rosterService as never,
    teamService as never,
    matchQueryService as never,
    developmentMapService as never,
    performanceAssessmentService as never,
    checkinService as never,
    eventService as never,
    balanceQueryService as never,
    medicalNoteService as never,
    nutritionNoteService as never,
    galleryService as never,
  );

  return { service, usersService, medicalNoteService, nutritionNoteService };
}

// UC-PLC-01 — un test por criterio de aceptación textual.
describe('PlayerCardQueryService.consultar', () => {
  it('2a: deniega el acceso COMPLETO (no solo secciones) a quien no tiene ninguna relación calificada con el atleta', async () => {
    const { service, usersService } = construirServicio({ esGuardian: false, equiposDelAtleta: [TEAM_ID], equiposDondeActorEsCoach: [] });

    await expect(
      service.consultar({ organizationId: ORG_ID, actorUserId: 'extraño-1', actorRoles: ['parent'], athleteUserId: ATHLETE_ID }),
    ).rejects.toThrow(ForbiddenException);
    expect(usersService.obtenerPorId).not.toHaveBeenCalled();
  });

  it('admin ve TODAS las secciones sin restricción, incluida la médica', async () => {
    const { service } = construirServicio();

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: 'admin-1', actorRoles: ['admin'], athleteUserId: ATHLETE_ID });

    expect(resultado.administrativo.restricted).toBe(false);
    expect(resultado.medico.restricted).toBe(false);
    expect(resultado.nutricion.restricted).toBe(false);
  });

  it('4a: el coach del equipo del atleta ve el resto de la Player Card con normalidad, pero la sección médica (y nutrición) muestra restringido', async () => {
    const { service } = construirServicio({ equiposDelAtleta: [TEAM_ID], equiposDondeActorEsCoach: [TEAM_ID] });

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: 'coach-1', actorRoles: ['coach'], athleteUserId: ATHLETE_ID });

    expect(resultado.administrativo.restricted).toBe(false);
    expect(resultado.deportivo.restricted).toBe(false);
    expect(resultado.medico.restricted).toBe(true);
    expect(resultado.medico.data).toBeNull();
    expect(resultado.nutricion.restricted).toBe(true);
  });

  it('el propio atleta ve su sección médica sin restricción', async () => {
    const { service } = construirServicio();

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: ATHLETE_ID, actorRoles: ['player'], athleteUserId: ATHLETE_ID });

    expect(resultado.medico.restricted).toBe(false);
  });

  it('un tutor con guardian_link vigente ve la sección médica de su hijo sin restricción', async () => {
    const { service } = construirServicio({ esGuardian: true });

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: 'tutor-1', actorRoles: ['parent'], athleteUserId: ATHLETE_ID });

    expect(resultado.medico.restricted).toBe(false);
  });

  it('sección de pagos: si Payments & Billing rechaza al actor, se marca restringida en vez de romper el resto de la Player Card', async () => {
    const { service } = construirServicio({ balanceLanzaForbidden: true });

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: 'admin-1', actorRoles: ['admin'], athleteUserId: ATHLETE_ID });

    expect(resultado.pagos.restricted).toBe(true);
    expect(resultado.administrativo.restricted).toBe(false);
  });
});
