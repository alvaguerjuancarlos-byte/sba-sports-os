import { describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ATTENDANCE_ID = 'att-1';
const ATLETA_MENOR = { id: 'atleta-menor', date_of_birth: '2015-01-01' };
const ATLETA_ADULTO = { id: 'atleta-adulto', date_of_birth: '1990-01-01' };

function usersServiceFalso(usuario: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(usuario) };
}

function guardianServiceFalso(esGuardian: boolean) {
  return { esGuardianDe: vi.fn().mockResolvedValue(esGuardian) };
}

// UC-CAL-03 — un test por criterio de aceptación textual.
describe('AttendanceService', () => {
  it('lanza NotFoundException si el attendance no existe', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from attendance where id/i, rows: [] }]));
    const service = new AttendanceService(db as never, usersServiceFalso(null) as never, guardianServiceFalso(false) as never);

    await expect(
      service.responder({ organizationId: ORG_ID, actorUserId: 'tutor-1', attendanceId: 'no-existe', decision: 'confirmed' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('la primera respuesta es la que cuenta — un RSVP ya respondido no se puede volver a responder', async () => {
    const attendance = { id: ATTENDANCE_ID, user_id: ATLETA_ADULTO.id, status: 'confirmed' };
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from attendance where id/i, rows: [attendance] }]));
    const service = new AttendanceService(db as never, usersServiceFalso(ATLETA_ADULTO) as never, guardianServiceFalso(false) as never);

    await expect(
      service.responder({ organizationId: ORG_ID, actorUserId: ATLETA_ADULTO.id, attendanceId: ATTENDANCE_ID, decision: 'declined' }),
    ).rejects.toThrow(ConflictException);
  });

  describe('jugador menor de edad', () => {
    const attendancePendiente = { id: ATTENDANCE_ID, user_id: ATLETA_MENOR.id, status: 'pending' };

    it('bloquea si quien responde no es tutor con guardian_link (criterio de aceptación)', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from attendance where id/i, rows: [attendancePendiente] }]));
      const service = new AttendanceService(db as never, usersServiceFalso(ATLETA_MENOR) as never, guardianServiceFalso(false) as never);

      await expect(
        service.responder({ organizationId: ORG_ID, actorUserId: 'no-es-tutor', attendanceId: ATTENDANCE_ID, decision: 'confirmed' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite responder a un tutor con guardian_link', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from attendance where id/i, rows: [attendancePendiente] },
        { matcher: /update attendance set status/i, rows: [{ ...attendancePendiente, status: 'confirmed', responded_by: 'tutor-1' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new AttendanceService(db as never, usersServiceFalso(ATLETA_MENOR) as never, guardianServiceFalso(true) as never);

      const resultado = await service.responder({ organizationId: ORG_ID, actorUserId: 'tutor-1', attendanceId: ATTENDANCE_ID, decision: 'confirmed' });

      expect(resultado.status).toBe('confirmed');
    });
  });

  describe('jugador adulto', () => {
    const attendancePendiente = { id: ATTENDANCE_ID, user_id: ATLETA_ADULTO.id, status: 'pending' };

    it('bloquea si alguien distinto del propio jugador intenta responder', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from attendance where id/i, rows: [attendancePendiente] }]));
      const service = new AttendanceService(db as never, usersServiceFalso(ATLETA_ADULTO) as never, guardianServiceFalso(false) as never);

      await expect(
        service.responder({ organizationId: ORG_ID, actorUserId: 'otro-user', attendanceId: ATTENDANCE_ID, decision: 'declined' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite al propio jugador responder', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from attendance where id/i, rows: [attendancePendiente] },
        { matcher: /update attendance set status/i, rows: [{ ...attendancePendiente, status: 'declined', responded_by: ATLETA_ADULTO.id }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new AttendanceService(db as never, usersServiceFalso(ATLETA_ADULTO) as never, guardianServiceFalso(false) as never);

      const resultado = await service.responder({ organizationId: ORG_ID, actorUserId: ATLETA_ADULTO.id, attendanceId: ATTENDANCE_ID, decision: 'declined' });

      expect(resultado.status).toBe('declined');
    });
  });
});
