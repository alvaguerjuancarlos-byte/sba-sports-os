import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TrialClassService } from './trial-class.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'staff-1';
const PROSPECT_ID = 'prospect-1';
const EVENT_ID = 'event-1';

function prospectServiceFalso(prospect: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(prospect) };
}
function eventServiceFalso(event: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(event) };
}

// UC-CRM-02 — un test por criterio de aceptación textual.
describe('TrialClassService', () => {
  describe('agendar', () => {
    it('lanza NotFoundException si el prospect no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new TrialClassService(db as never, prospectServiceFalso(null) as never, eventServiceFalso(null) as never);

      await expect(service.agendar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, prospectId: 'no-existe', eventId: EVENT_ID })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza agendar si el prospect no está en stage=trial', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new TrialClassService(db as never, prospectServiceFalso({ id: PROSPECT_ID, stage: 'lead' }) as never, eventServiceFalso(null) as never);

      await expect(service.agendar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, prospectId: PROSPECT_ID, eventId: EVENT_ID })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza NotFoundException si el event no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new TrialClassService(db as never, prospectServiceFalso({ id: PROSPECT_ID, stage: 'trial' }) as never, eventServiceFalso(null) as never);

      await expect(service.agendar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, prospectId: PROSPECT_ID, eventId: 'no-existe' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('crea trial_class_attendance con attended=null — nunca inferido de la ausencia de registro', async () => {
      const stubs: QueryStub[] = [{ matcher: /insert into trial_class_attendance/i, rows: [{ id: 'tca-1', attended: null }] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new TrialClassService(
        db as never,
        prospectServiceFalso({ id: PROSPECT_ID, stage: 'trial' }) as never,
        eventServiceFalso({ id: EVENT_ID }) as never,
      );

      const resultado = await service.agendar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, prospectId: PROSPECT_ID, eventId: EVENT_ID });

      expect(resultado.attended).toBeNull();
    });
  });

  describe('marcarAsistencia', () => {
    it('fija attended de forma explícita (true/false)', async () => {
      const stubs: QueryStub[] = [{ matcher: /update trial_class_attendance set attended/i, rows: [{ id: 'tca-1', attended: true }] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new TrialClassService(db as never, prospectServiceFalso(null) as never, eventServiceFalso(null) as never);

      await expect(service.marcarAsistencia({ organizationId: ORG_ID, actorUserId: ACTOR_ID, trialClassAttendanceId: 'tca-1', attended: true })).resolves.toMatchObject({
        attended: true,
      });
    });

    it('lanza NotFoundException si no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /update trial_class_attendance set attended/i, rows: [] }]));
      const service = new TrialClassService(db as never, prospectServiceFalso(null) as never, eventServiceFalso(null) as never);

      await expect(
        service.marcarAsistencia({ organizationId: ORG_ID, actorUserId: ACTOR_ID, trialClassAttendanceId: 'no-existe', attended: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
