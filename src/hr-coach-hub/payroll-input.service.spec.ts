import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PayrollInputService } from './payroll-input.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';
const EMPLOYEE_ID = 'employee-1';

function employeeServiceFalso(employee: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(employee) };
}

// UC-HR-03 — un test por criterio de aceptación textual.
describe('PayrollInputService', () => {
  it('lanza NotFoundException si el employee no existe', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new PayrollInputService(db as never, employeeServiceFalso(null) as never);

    await expect(service.capturar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, employeeId: 'no-existe', period: '2026-01' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza capturar insumos para un employee inactivo', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new PayrollInputService(db as never, employeeServiceFalso({ id: EMPLOYEE_ID, status: 'inactive' }) as never);

    await expect(service.capturar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, employeeId: EMPLOYEE_ID, period: '2026-01' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('2a: permite guardar el payroll_input con hours nulo', async () => {
    const stubs: QueryStub[] = [{ matcher: /insert into payroll_input/i, rows: [{ id: 'pi-1', hours: null, bonuses: '0' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new PayrollInputService(db as never, employeeServiceFalso({ id: EMPLOYEE_ID, status: 'active' }) as never);

    const resultado = await service.capturar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, employeeId: EMPLOYEE_ID, period: '2026-01' });

    expect(resultado.hours).toBeNull();
  });
});
