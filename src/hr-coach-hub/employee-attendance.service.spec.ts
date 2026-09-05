import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EmployeeAttendanceService } from './employee-attendance.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'employee-1';
const EMPLOYEE_ID = 'employee-1';

function employeeServiceFalso(employee: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(employee) };
}

describe('EmployeeAttendanceService', () => {
  it('lanza NotFoundException si el employee no existe', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new EmployeeAttendanceService(db as never, employeeServiceFalso(null) as never);

    await expect(service.registrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, employeeId: 'no-existe' })).rejects.toThrow(NotFoundException);
  });

  it('registra el check-in de personal', async () => {
    const stubs: QueryStub[] = [{ matcher: /insert into employee_attendance/i, rows: [{ id: 'ea-1', employee_id: EMPLOYEE_ID }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new EmployeeAttendanceService(db as never, employeeServiceFalso({ id: EMPLOYEE_ID }) as never);

    await expect(service.registrar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, employeeId: EMPLOYEE_ID })).resolves.toMatchObject({ id: 'ea-1' });
  });
});
