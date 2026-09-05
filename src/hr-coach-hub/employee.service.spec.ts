import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EmployeeService } from './employee.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';
const EMPLOYEE_ID = 'employee-1';

// UC-HR-01 — un test por criterio de aceptación textual.
describe('EmployeeService', () => {
  it('1a: permite dar de alta un expediente sin user_id (personal sin cuenta de acceso)', async () => {
    const auditLog = crearAuditLogFalso();
    const stubs: QueryStub[] = [{ matcher: /insert into employee/i, rows: [{ id: EMPLOYEE_ID, user_id: null, contract_type: 'nomina', status: 'active' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new EmployeeService(db as never, auditLog as never);

    const resultado = await service.altaExpediente({ organizationId: ORG_ID, actorUserId: ACTOR_ID, contractType: 'nomina', hireDate: '2026-01-01' });

    expect(resultado.user_id).toBeNull();
    expect(auditLog.record).toHaveBeenCalledOnce();
  });

  describe('actualizar', () => {
    it('lanza NotFoundException si no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from employee where id/i, rows: [] }]));
      const service = new EmployeeService(db as never, crearAuditLogFalso() as never);

      await expect(service.actualizar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, employeeId: 'no-existe', status: 'inactive' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('3a: dar de baja (status=inactive) es una actualización sobre el mismo registro, no uno nuevo', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from employee where id/i, rows: [{ id: EMPLOYEE_ID, contract_type: 'nomina', status: 'active' }] },
        { matcher: /update employee set/i, rows: [{ id: EMPLOYEE_ID, contract_type: 'nomina', status: 'inactive' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new EmployeeService(db as never, crearAuditLogFalso() as never);

      const resultado = await service.actualizar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, employeeId: EMPLOYEE_ID, status: 'inactive' });

      expect(resultado.status).toBe('inactive');
    });
  });
});
