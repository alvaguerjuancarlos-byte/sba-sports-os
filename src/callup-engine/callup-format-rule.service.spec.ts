import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CallupFormatRuleService } from './callup-format-rule.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'admin-1';

// UC-CUP-06 — un test por criterio de aceptación textual.
describe('CallupFormatRuleService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('crear', () => {
    it('no permite dos reglas activas para el mismo deporte y formato', async () => {
      const client = crearClientFalso([]);
      (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string) => {
        if (/insert into callup_format_rule/i.test(sql)) return Promise.reject(Object.assign(new Error('duplicate'), { code: '23505' }));
        throw new Error(`Query sin stub configurado: ${sql}`);
      });
      const db = crearDbFalsa(client);
      const service = new CallupFormatRuleService(db as never, auditLog as never);

      await expect(
        service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, sport: 'Futbol', format: 'Fut7', maxPlayers: 12 }),
      ).rejects.toThrow(ConflictException);
    });

    it('crea la regla con los valores semilla del RFP (ej. Fut7 = 12) y la audita', async () => {
      const stubs: QueryStub[] = [
        { matcher: /insert into callup_format_rule/i, rows: [{ id: 'rule-1', sport: 'Futbol', format: 'Fut7', max_players: 12, priority_window_days: 28, status: 'active' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new CallupFormatRuleService(db as never, auditLog as never);

      const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, sport: 'Futbol', format: 'Fut7', maxPlayers: 12 });

      expect(resultado.max_players).toBe(12);
      expect(auditLog.record).toHaveBeenCalledOnce();
    });
  });

  describe('archivar', () => {
    it('lanza NotFoundException si no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from callup_format_rule where id/i, rows: [] }]));
      const service = new CallupFormatRuleService(db as never, auditLog as never);

      await expect(service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, callupFormatRuleId: 'no-existe' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('archiva sin borrar — permite crear una regla nueva con el mismo deporte/formato después', async () => {
      const anterior = { id: 'rule-1', status: 'active' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from callup_format_rule where id/i, rows: [anterior] },
        { matcher: /update callup_format_rule set status = 'archived'/i, rows: [{ ...anterior, status: 'archived' }] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new CallupFormatRuleService(db as never, auditLog as never);

      const resultado = await service.archivar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, callupFormatRuleId: 'rule-1' });

      expect(resultado.status).toBe('archived');
      const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /delete/i.test(sql));
      expect(llamadasDelete).toHaveLength(0);
    });
  });

  describe('obtenerActivaPara', () => {
    it('regresa null si no existe una regla activa para ese deporte/formato', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from callup_format_rule where sport/i, rows: [] }]));
      const service = new CallupFormatRuleService(db as never, auditLog as never);

      await expect(service.obtenerActivaPara(ORG_ID, 'Futbol', 'Fut9')).resolves.toBeNull();
    });
  });
});
