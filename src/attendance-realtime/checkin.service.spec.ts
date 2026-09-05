import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CheckinService } from './checkin.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'coach-1';
const EVENT_ID = 'event-1';
const USER_ID = 'jugador-1';

function eventServiceFalso(event: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(event) };
}

function rosterServiceFalso(roster: Record<string, unknown>[]) {
  return { listarPorEquipo: vi.fn().mockResolvedValue(roster) };
}

// UC-ATT-01/02/03/04 — un test por criterio de aceptación textual.
describe('CheckinService', () => {
  describe('registrarFacial', () => {
    it('lanza NotFoundException si el event no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new CheckinService(db as never, eventServiceFalso(null) as never, rosterServiceFalso([]) as never);

      await expect(
        service.registrarFacial({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: 'no-existe', userId: USER_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza el check-in facial sin consentimiento biométrico vigente', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from biometric_consent where user_id/i, rows: [] }]));
      const service = new CheckinService(db as never, eventServiceFalso({ id: EVENT_ID, team_id: null }) as never, rosterServiceFalso([]) as never);

      await expect(
        service.registrarFacial({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, userId: USER_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza el check-in facial si hay consentimiento pero ningún template enrolado', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from biometric_consent where user_id/i, rows: [{ id: 'bc-1', consent_status: 'granted' }] },
        { matcher: /select 1 from biometric_template/i, rows: [] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new CheckinService(db as never, eventServiceFalso({ id: EVENT_ID, team_id: null }) as never, rosterServiceFalso([]) as never);

      await expect(
        service.registrarFacial({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, userId: USER_ID }),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea el checkin facial cuando hay consentimiento vigente y un template enrolado', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from biometric_consent where user_id/i, rows: [{ id: 'bc-1', consent_status: 'granted' }] },
        { matcher: /select 1 from biometric_template/i, rows: [{ '?column?': 1 }] },
        { matcher: /insert into checkin_event/i, rows: [{ id: 'checkin-1', method: 'facial', event_id: EVENT_ID, user_id: USER_ID }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new CheckinService(db as never, eventServiceFalso({ id: EVENT_ID, team_id: null }) as never, rosterServiceFalso([]) as never);

      const resultado = await service.registrarFacial({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, userId: USER_ID });

      expect(resultado.method).toBe('facial');
    });

    it('no permite un segundo check-in al mismo evento (unique violation → 409)', async () => {
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/select \* from biometric_consent where user_id/i.test(sql)) return Promise.resolve({ rows: [{ consent_status: 'granted' }] });
        if (/select 1 from biometric_template/i.test(sql)) return Promise.resolve({ rows: [{ '?column?': 1 }] });
        if (/insert into checkin_event/i.test(sql)) return Promise.reject(Object.assign(new Error('duplicate'), { code: '23505' }));
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new CheckinService(db as never, eventServiceFalso({ id: EVENT_ID, team_id: null }) as never, rosterServiceFalso([]) as never);

      await expect(
        service.registrarFacial({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, userId: USER_ID }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('registrarManual', () => {
    it('lanza NotFoundException si el event no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new CheckinService(db as never, eventServiceFalso(null) as never, rosterServiceFalso([]) as never);

      await expect(
        service.registrarManual({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: 'no-existe', userId: USER_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('no marca para revisión si la persona sí está en el roster esperado', async () => {
      const roster = rosterServiceFalso([{ user_id: USER_ID }]);
      const stubs: QueryStub[] = [{ matcher: /insert into checkin_event/i, rows: [{ id: 'checkin-1', flagged_for_review: false, confirmed_by: ACTOR_ID }] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new CheckinService(db as never, eventServiceFalso({ id: EVENT_ID, team_id: 'team-1' }) as never, roster as never);

      const resultado = await service.registrarManual({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, userId: USER_ID });

      expect(resultado.flagged_for_review).toBe(false);
      expect(resultado.confirmed_by).toBe(ACTOR_ID);
    });

    it('marca para revisión administrativa si la persona NO está en el roster esperado (alt 1a)', async () => {
      const roster = rosterServiceFalso([{ user_id: 'otro-jugador' }]);
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string, params: unknown[]) => {
        if (/insert into checkin_event/i.test(sql)) return Promise.resolve({ rows: [{ id: 'checkin-1', flagged_for_review: params[4] }] });
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new CheckinService(db as never, eventServiceFalso({ id: EVENT_ID, team_id: 'team-1' }) as never, roster as never);

      const resultado = await service.registrarManual({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, userId: USER_ID });

      expect(resultado.flagged_for_review).toBe(true);
    });

    it('un evento multi-equipo (sin team_id) nunca marca para revisión ni consulta el roster', async () => {
      const roster = rosterServiceFalso([]);
      const stubs: QueryStub[] = [{ matcher: /insert into checkin_event/i, rows: [{ id: 'checkin-1', flagged_for_review: false }] }];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new CheckinService(db as never, eventServiceFalso({ id: EVENT_ID, team_id: null }) as never, roster as never);

      await service.registrarManual({ organizationId: ORG_ID, actorUserId: ACTOR_ID, eventId: EVENT_ID, userId: USER_ID });

      expect(roster.listarPorEquipo).not.toHaveBeenCalled();
    });
  });

  describe('revisarAsistencia', () => {
    it('lanza NotFoundException si el event no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new CheckinService(db as never, eventServiceFalso(null) as never, rosterServiceFalso([]) as never);

      await expect(service.revisarAsistencia(ORG_ID, 'no-existe')).rejects.toThrow(NotFoundException);
    });

    it('identifica quiénes del roster esperado todavía no tienen checkin_event', async () => {
      const roster = rosterServiceFalso([{ user_id: 'jugador-1' }, { user_id: 'jugador-2' }]);
      const presentes = [{ id: 'checkin-1', user_id: 'jugador-1' }];
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from checkin_event where event_id/i, rows: presentes }]));
      const service = new CheckinService(db as never, eventServiceFalso({ id: EVENT_ID, team_id: 'team-1' }) as never, roster as never);

      const resultado = await service.revisarAsistencia(ORG_ID, EVENT_ID);

      expect(resultado.presentes).toHaveLength(1);
      expect(resultado.faltantes).toEqual(['jugador-2']);
    });
  });

  describe('aforo', () => {
    it('aforoPorEvento cuenta directo desde checkin_event', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select count\(\*\) as total from checkin_event/i, rows: [{ total: '5' }] }]));
      const service = new CheckinService(db as never, eventServiceFalso(null) as never, rosterServiceFalso([]) as never);

      await expect(service.aforoPorEvento(ORG_ID, EVENT_ID)).resolves.toBe(5);
    });

    it('aforoPorSede regresa el conteo por evento activo ahora mismo en esa sede', async () => {
      const db = crearDbFalsa(
        crearClientFalso([{ matcher: /from event e/i, rows: [{ event_id: 'event-1', checkins: '3' }] }]),
      );
      const service = new CheckinService(db as never, eventServiceFalso(null) as never, rosterServiceFalso([]) as never);

      await expect(service.aforoPorSede(ORG_ID, 'venue-1')).resolves.toEqual([{ eventId: 'event-1', checkins: 3 }]);
    });
  });
});
