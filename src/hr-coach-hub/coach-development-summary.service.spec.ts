import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CoachDevelopmentSummaryService } from './coach-development-summary.service.js';

const ORG_ID = 'org-1';
const COACH_USER_ID = 'coach-user-1';
const EMPLOYEE_ID = 'employee-1';
const TEAM_ID = 'team-1';

function employeeServiceFalso(employee: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(employee) };
}
function coachObjectiveServiceFalso() {
  return { consultarPorEmpleado: vi.fn().mockResolvedValue([{ id: 'co-1' }]) };
}
function rosterServiceFalso(teamIds: string[]) {
  return { listarEquiposDeUsuario: vi.fn().mockResolvedValue(teamIds) };
}
function teamServiceFalso() {
  return { obtenerPorId: vi.fn().mockResolvedValue({ id: TEAM_ID, name: 'Sub-16' }) };
}
function leagueServiceFalso() {
  return { consultarStandingsPorEquipo: vi.fn().mockResolvedValue([{ team_id: TEAM_ID, points: 10 }]) };
}

describe('CoachDevelopmentSummaryService', () => {
  it('lanza NotFoundException si el employee no existe', async () => {
    const service = new CoachDevelopmentSummaryService(
      employeeServiceFalso(null) as never,
      coachObjectiveServiceFalso() as never,
      rosterServiceFalso([]) as never,
      teamServiceFalso() as never,
      leagueServiceFalso() as never,
    );

    await expect(service.consultar({ organizationId: ORG_ID, actorUserId: 'admin-1', actorRoles: ['admin'], employeeId: 'no-existe' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza a un coach que no es dueño del expediente', async () => {
    const service = new CoachDevelopmentSummaryService(
      employeeServiceFalso({ id: EMPLOYEE_ID, user_id: COACH_USER_ID }) as never,
      coachObjectiveServiceFalso() as never,
      rosterServiceFalso([]) as never,
      teamServiceFalso() as never,
      leagueServiceFalso() as never,
    );

    await expect(
      service.consultar({ organizationId: ORG_ID, actorUserId: 'otro-coach', actorRoles: ['coach'], employeeId: EMPLOYEE_ID }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ensambla objetivos del coach + equipos donde es coach + standings de esos equipos', async () => {
    const service = new CoachDevelopmentSummaryService(
      employeeServiceFalso({ id: EMPLOYEE_ID, user_id: COACH_USER_ID }) as never,
      coachObjectiveServiceFalso() as never,
      rosterServiceFalso([TEAM_ID]) as never,
      teamServiceFalso() as never,
      leagueServiceFalso() as never,
    );

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: COACH_USER_ID, actorRoles: ['coach'], employeeId: EMPLOYEE_ID });

    expect(resultado.objetivos).toHaveLength(1);
    expect(resultado.equipos).toHaveLength(1);
    expect(resultado.equipos[0].team?.name).toBe('Sub-16');
    expect(resultado.equipos[0].standings[0].points).toBe(10);
  });

  it('un employee sin user_id vinculado no tiene equipos (nunca truena)', async () => {
    const service = new CoachDevelopmentSummaryService(
      employeeServiceFalso({ id: EMPLOYEE_ID, user_id: null }) as never,
      coachObjectiveServiceFalso() as never,
      rosterServiceFalso([]) as never,
      teamServiceFalso() as never,
      leagueServiceFalso() as never,
    );

    const resultado = await service.consultar({ organizationId: ORG_ID, actorUserId: 'admin-1', actorRoles: ['admin'], employeeId: EMPLOYEE_ID });

    expect(resultado.equipos).toHaveLength(0);
  });
});
