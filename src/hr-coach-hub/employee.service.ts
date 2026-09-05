import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { EmployeeRow, EmployeeStatus } from './hr-coach-hub.types.js';

export interface AltaExpedienteInput {
  organizationId: string;
  actorUserId: string;
  userId?: string | null;
  contractType: string;
  hireDate: string;
}

export interface ActualizarExpedienteInput {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  contractType?: string;
  status?: EmployeeStatus;
}

// UC-HR-01 — Alta y gestión de expediente de personal. Dato restringido de HR (arquitectura
// §7.4) — todo acceso de lectura pasa por el guard de rol del controller (admin/director), nunca
// visible ni al propio coach consultando su perfil general (criterio de aceptación, literal).
@Injectable()
export class EmployeeService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  // 1a: "La persona no tiene user en la plataforma todavía → el sistema permite
  // employee.user_id nulo."
  async altaExpediente(input: AltaExpedienteInput): Promise<EmployeeRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<EmployeeRow>(
        `insert into employee (organization_id, user_id, contract_type, hire_date, status)
         values ($1, $2, $3, $4, 'active')
         returning *`,
        [input.organizationId, input.userId ?? null, input.contractType, input.hireDate],
      );
      const employee = rows[0];

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'employee',
        entityId: employee.id,
        newValue: { userId: employee.user_id, contractType: employee.contract_type, hireDate: employee.hire_date },
      });

      return employee;
    });
  }

  // 3. "Cambios posteriores... se registran como actualizaciones al mismo employee, nunca como
  // registros nuevos que rompan el historial." 3a (baja): status='inactive' nunca borra
  // payroll_input/coach_objective — no se tocan aquí, ni existe un método de borrado para ellos.
  async actualizar(input: ActualizarExpedienteInput): Promise<EmployeeRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<EmployeeRow>(`select * from employee where id = $1`, [input.employeeId]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('employee no encontrado.');

      const { rows: updated } = await client.query<EmployeeRow>(
        `update employee set
           contract_type = coalesce($2, contract_type),
           status = coalesce($3, status),
           updated_at = now()
         where id = $1
         returning *`,
        [input.employeeId, input.contractType ?? null, input.status ?? null],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'employee',
        entityId: anterior.id,
        oldValue: { contractType: anterior.contract_type, status: anterior.status },
        newValue: { contractType: updated[0].contract_type, status: updated[0].status },
      });

      return updated[0];
    });
  }

  async listar(organizationId: string, opciones: { status?: EmployeeStatus } = {}): Promise<EmployeeRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      if (opciones.status) {
        const { rows } = await client.query<EmployeeRow>(`select * from employee where status = $1 order by hire_date desc`, [opciones.status]);
        return rows;
      }
      const { rows } = await client.query<EmployeeRow>(`select * from employee order by hire_date desc`);
      return rows;
    });
  }

  async obtenerPorId(organizationId: string, employeeId: string): Promise<EmployeeRow | null> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<EmployeeRow>(`select * from employee where id = $1`, [employeeId]);
      return rows[0] ?? null;
    });
  }

  // Lectura mínima para que un coach resuelva su propio employeeId (necesario para UC-HR-04,
  // "todo coach_objective es consultable por el propio coach") sin exponerle su expediente
  // completo — devuelve solo el id, nunca contract_type/hire_date/status.
  async obtenerIdPorUsuario(organizationId: string, userId: string): Promise<string | null> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<{ id: string }>(`select id from employee where user_id = $1`, [userId]);
      return rows[0]?.id ?? null;
    });
  }
}
