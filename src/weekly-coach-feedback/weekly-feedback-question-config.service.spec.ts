import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { WeeklyFeedbackQuestionConfigService } from './weekly-feedback-question-config.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';

// UC-WCF-01, paso 2 — un test por criterio de aceptación textual.
describe('WeeklyFeedbackQuestionConfigService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('crear', () => {
    it('no permite dos configuraciones activas para el mismo deporte', async () => {
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/insert into weekly_feedback_question_config/i.test(sql)) return Promise.reject(Object.assign(new Error('duplicate'), { code: '23505' }));
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new WeeklyFeedbackQuestionConfigService(db as never, auditLog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, sport: 'Futbol', question1Label: 'a', question2Label: 'b', question3Label: 'c' }),
      ).rejects.toThrow(ConflictException);
    });

    it('crea la configuración y la audita', async () => {
      const stubs: QueryStub[] = [
        { matcher: /insert into weekly_feedback_question_config/i, rows: [{ id: 'cfg-1', sport: 'Futbol', status: 'active' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new WeeklyFeedbackQuestionConfigService(db as never, auditLog as never);

      const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, sport: 'Futbol', question1Label: 'a', question2Label: 'b', question3Label: 'c' });

      expect(resultado.sport).toBe('Futbol');
      expect(auditLog.record).toHaveBeenCalledOnce();
    });
  });

  describe('archivar', () => {
    it('lanza NotFoundException si no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from weekly_feedback_question_config where id/i, rows: [] }]));
      const service = new WeeklyFeedbackQuestionConfigService(db as never, auditLog as never);

      await expect(service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, configId: 'no-existe' })).rejects.toThrow(NotFoundException);
    });

    it('archiva sin borrar', async () => {
      const anterior = { id: 'cfg-1', status: 'active' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from weekly_feedback_question_config where id/i, rows: [anterior] },
        { matcher: /update weekly_feedback_question_config set status = 'archived'/i, rows: [{ ...anterior, status: 'archived' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new WeeklyFeedbackQuestionConfigService(db as never, auditLog as never);

      const resultado = await service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, configId: 'cfg-1' });

      expect(resultado.status).toBe('archived');
    });
  });

  describe('obtenerActivaPara', () => {
    it('regresa null si no existe una configuración activa para ese deporte', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from weekly_feedback_question_config where sport/i, rows: [] }]));
      const service = new WeeklyFeedbackQuestionConfigService(db as never, auditLog as never);

      await expect(service.obtenerActivaPara(ORG_ID, 'Futbol')).resolves.toBeNull();
    });
  });
});
