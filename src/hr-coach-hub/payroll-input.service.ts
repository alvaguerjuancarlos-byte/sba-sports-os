import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { EmployeeService } from './employee.service.js';
import type { PayrollInputRow } from './hr-coach-hub.types.js';

export interface CapturarInsumoNominaInput {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  period: string;
  hours?: number | null;
  bonuses?: number;
  deductionsNotes?: string | null;
}

// UC-HR-03 — Capturar insumos de nómina. El sistema NUNCA calcula un monto a pagar — solo
// captura y expone los insumos para el sistema externo de nómina de SBA (criterio de aceptación,
// literal). No hay ningún método aquí que sume hours/bonuses en un total.
@Injectable()
export class PayrollInputService {
  constructor(
    private readonly db: DatabaseService,
    private readonly employeeService: EmployeeService,
  ) {}

  // 2a: "un employee no tiene hours capturadas para el periodo → el sistema permite guardar el
  // payroll_input con hours nulo — no todo tipo de contrato requiere ese campo."
  async capturar(input: CapturarInsumoNominaInput): Promise<PayrollInputRow> {
    const employee = await this.employeeService.obtenerPorId(input.organizationId, input.employeeId);
    if (!employee) throw new NotFoundException('employee no encontrado.');
    if (employee.status !== 'active') {
      throw new BadRequestException('Solo se capturan insumos de nómina para un employee activo en el periodo.');
    }

    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<PayrollInputRow>(
        `insert into payroll_input (organization_id, employee_id, period, hours, bonuses, deductions_notes)
         values ($1, $2, $3, $4, $5, $6)
         returning *`,
        [input.organizationId, input.employeeId, input.period, input.hours ?? null, input.bonuses ?? 0, input.deductionsNotes ?? null],
      );
      return rows[0];
    });
  }

  async listarPorEmpleado(organizationId: string, employeeId: string): Promise<PayrollInputRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<PayrollInputRow>(`select * from payroll_input where employee_id = $1 order by period desc`, [employeeId]);
      return rows;
    });
  }
}
