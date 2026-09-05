import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeService } from './employee.service.js';
import { CoachObjectiveService } from './coach-objective.service.js';
import { RosterService } from '../sports-hub/roster.service.js';
import { TeamService } from '../sports-hub/team.service.js';
import { LeagueService } from '../sports-hub/league.service.js';
import type { CoachObjectiveRow, EmployeeRow } from './hr-coach-hub.types.js';
import type { TeamRow, LeagueStandingRow } from '../sports-hub/sports-hub.types.js';

export interface ConsultarResumenDeCoachInput {
  organizationId: string;
  actorUserId: string;
  actorRoles: string[];
  employeeId: string;
}

export interface ResumenDeCoach {
  employee: EmployeeRow;
  objetivos: CoachObjectiveRow[];
  equipos: { team: TeamRow | null; standings: LeagueStandingRow[] }[];
}

// UC-HR-05, condensado — Consultar resumen de desarrollo de coach/equipo. "Mismo patrón de vista
// ensamblada que Player Card (UC-PLC-01, Fase 5) aplicado a personal en vez de atletas" (literal)
// — ensambla coach_objective (propio) + roster/team/league_standing (Sports Hub), nunca duplica
// el dato de origen.
@Injectable()
export class CoachDevelopmentSummaryService {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly coachObjectiveService: CoachObjectiveService,
    private readonly rosterService: RosterService,
    private readonly teamService: TeamService,
    private readonly leagueService: LeagueService,
  ) {}

  async consultar(input: ConsultarResumenDeCoachInput): Promise<ResumenDeCoach> {
    const employee = await this.employeeService.obtenerPorId(input.organizationId, input.employeeId);
    if (!employee) throw new NotFoundException('employee no encontrado.');

    const esStaffDeHr = input.actorRoles.includes('admin') || input.actorRoles.includes('director');
    if (!esStaffDeHr && employee.user_id !== input.actorUserId) {
      throw new ForbiddenException('Solo HR/dirección o el propio coach pueden consultar este resumen.');
    }

    const objetivos = await this.coachObjectiveService.consultarPorEmpleado({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorRoles: input.actorRoles,
      employeeId: input.employeeId,
    });

    let equipos: ResumenDeCoach['equipos'] = [];
    if (employee.user_id) {
      const teamIds = await this.rosterService.listarEquiposDeUsuario(input.organizationId, employee.user_id, { role: 'coach' });
      equipos = await Promise.all(
        teamIds.map(async (teamId) => ({
          team: await this.teamService.obtenerPorId(input.organizationId, teamId),
          standings: await this.leagueService.consultarStandingsPorEquipo(input.organizationId, teamId),
        })),
      );
    }

    return { employee, objetivos, equipos };
  }
}
