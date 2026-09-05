import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { EmployeeService } from './employee.service.js';
import type { CoachObjectiveRow, CoachObjectiveStatus } from './hr-coach-hub.types.js';

export interface DefinirObjetivoInput {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  period: string;
  objectiveText: string;
}

export interface ActualizarStatusObjetivoInput {
  organizationId: string;
  actorUserId: string;
  coachObjectiveId: string;
  status: CoachObjectiveStatus;
}

export interface ConsultarObjetivosInput {
  organizationId: string;
  actorUserId: string;
  actorRoles: string[];
  employeeId: string;
}

// UC-HR-04 — Definir y dar seguimiento a objetivos de coach.
//
// [propuesto]: la precondición "existe employee con rol de coach" no se valida contra
// user_tenant_role — el documento no describe un flujo de error para esta precondición (a
// diferencia de otras que sí traen su "Xa" explícito), y employee no tiene un campo de rol propio
// (solo contract_type/hire_date/status, arquitectura §6.3) — se confía en que quien define el
// objetivo eligió un employee de tipo coach, sin duplicar la verificación de rol de Identity &
// Access aquí.
//
// 3a: "no se cierra automáticamente como not_achieved" al vencer el periodo — se cumple por
// construcción, no hay ningún cron/scheduler en este servicio que module status.
@Injectable()
export class CoachObjectiveService {
  constructor(
    private readonly db: DatabaseService,
    private readonly employeeService: EmployeeService,
  ) {}

  async definir(input: DefinirObjetivoInput): Promise<CoachObjectiveRow> {
    const employee = await this.employeeService.obtenerPorId(input.organizationId, input.employeeId);
    if (!employee) throw new NotFoundException('employee no encontrado.');

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<CoachObjectiveRow>(
        `insert into coach_objective (organization_id, employee_id, period, objective_text, status)
         values ($1, $2, $3, $4, 'open')
         returning *`,
        [input.organizationId, input.employeeId, input.period, input.objectiveText],
      );
      return rows[0];
    });
  }

  // 3. "coach o director actualizan el status (open -> in_progress -> achieved|not_achieved)" —
  // no se valida una máquina de estados estricta (el UC no lo exige explícitamente, a diferencia
  // de otros dominios que sí documentan transiciones prohibidas).
  async actualizarStatus(input: ActualizarStatusObjetivoInput): Promise<CoachObjectiveRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<CoachObjectiveRow>(
        `update coach_objective set status = $2, updated_at = now() where id = $1 returning *`,
        [input.coachObjectiveId, input.status],
      );
      if (!rows[0]) throw new NotFoundException('coach_objective no encontrado.');
      return rows[0];
    });
  }

  // Criterio de aceptación: "todo coach_objective es consultable por el propio coach al que
  // pertenece, no solo por HR/dirección."
  async consultarPorEmpleado(input: ConsultarObjetivosInput): Promise<CoachObjectiveRow[]> {
    const esStaffDeHr = input.actorRoles.includes('admin') || input.actorRoles.includes('director');
    if (!esStaffDeHr) {
      const employee = await this.employeeService.obtenerPorId(input.organizationId, input.employeeId);
      if (!employee || employee.user_id !== input.actorUserId) {
        throw new ForbiddenException('Solo HR/dirección o el propio coach pueden consultar estos objetivos.');
      }
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<CoachObjectiveRow>(`select * from coach_objective where employee_id = $1 order by period desc`, [
        input.employeeId,
      ]);
      return rows;
    });
  }
}
