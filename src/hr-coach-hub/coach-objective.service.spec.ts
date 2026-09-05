import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CoachObjectiveService } from './coach-objective.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';
const COACH_USER_ID = 'coach-user-1';
const EMPLOYEE_ID = 'employee-1';

function employeeServiceFalso(employee: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(employee) };
}

// UC-HR-04 — un test por criterio de aceptación textual.
describe('CoachObjectiveService', () => {
  describe('definir', () => {
    it('lanza NotFoundException si el employee no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new CoachObjectiveService(db as never, employeeServiceFalso(null) as never);

      await expect(
        service.definir({ organizationId: ORG_ID, actorUserId: ACTOR_ID, employeeId: 'no-existe', period: '2026-Q1', objectiveText: 'mejorar posesión' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea el objetivo en status=open', async () => {
      const stubs: QueryStub[] = [{ matcher: /insert into coach_objective/i, rows: [{ id: 'co-1', status: 'open' }] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new CoachObjectiveService(db as never, employeeServiceFalso({ id: EMPLOYEE_ID }) as never);

      const resultado = await service.definir({ organizationId: ORG_ID, actorUserId: ACTOR_ID, employeeId: EMPLOYEE_ID, period: '2026-Q1', objectiveText: 'mejorar posesión' });

      expect(resultado.status).toBe('open');
    });
  });

  describe('consultarPorEmpleado', () => {
    it('permite a HR/dirección consultar objetivos de cualquier coach', async () => {
      const stubs: QueryStub[] = [{ matcher: /select \* from coach_objective/i, rows: [{ id: 'co-1' }] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new CoachObjectiveService(db as never, employeeServiceFalso({ id: EMPLOYEE_ID, user_id: COACH_USER_ID }) as never);

      await expect(
        service.consultarPorEmpleado({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['admin'], employeeId: EMPLOYEE_ID }),
      ).resolves.toHaveLength(1);
    });

    it('permite al propio coach consultar sus objetivos', async () => {
      const stubs: QueryStub[] = [{ matcher: /select \* from coach_objective/i, rows: [{ id: 'co-1' }] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new CoachObjectiveService(db as never, employeeServiceFalso({ id: EMPLOYEE_ID, user_id: COACH_USER_ID }) as never);

      await expect(
        service.consultarPorEmpleado({ organizationId: ORG_ID, actorUserId: COACH_USER_ID, actorRoles: ['coach'], employeeId: EMPLOYEE_ID }),
      ).resolves.toHaveLength(1);
    });

    it('rechaza a un coach que no es dueño del expediente', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new CoachObjectiveService(db as never, employeeServiceFalso({ id: EMPLOYEE_ID, user_id: COACH_USER_ID }) as never);

      await expect(
        service.consultarPorEmpleado({ organizationId: ORG_ID, actorUserId: 'otro-coach', actorRoles: ['coach'], employeeId: EMPLOYEE_ID }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
