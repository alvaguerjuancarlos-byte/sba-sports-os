import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { EmployeeService } from './employee.service.js';
import type { EmployeeAttendanceRow } from './hr-coach-hub.types.js';

export interface RegistrarAsistenciaInput {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
}

// UC-HR-02, condensado — Registrar asistencia de personal. Ver nota de alcance en la migración
// 0015: alimenta fact_hr_attendance (OLAP, se construye en Reporting & AI, más adelante en esta
// misma fase) — aquí solo se captura el evento OLTP.
@Injectable()
export class EmployeeAttendanceService {
  constructor(
    private readonly db: DatabaseService,
    private readonly employeeService: EmployeeService,
  ) {}

  async registrar(input: RegistrarAsistenciaInput): Promise<EmployeeAttendanceRow> {
    const employee = await this.employeeService.obtenerPorId(input.organizationId, input.employeeId);
    if (!employee) throw new NotFoundException('employee no encontrado.');

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<EmployeeAttendanceRow>(
        `insert into employee_attendance (organization_id, employee_id) values ($1, $2) returning *`,
        [input.organizationId, input.employeeId],
      );
      return rows[0];
    });
  }

  async listarPorEmpleado(organizationId: string, employeeId: string): Promise<EmployeeAttendanceRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<EmployeeAttendanceRow>(
        `select * from employee_attendance where employee_id = $1 order by checked_in_at desc`,
        [employeeId],
      );
      return rows;
    });
  }
}
