import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BiometricConsentService } from './biometric-consent.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const MENOR = { id: 'menor-1', date_of_birth: '2015-01-01' };
const ADULTO = { id: 'adulto-1', date_of_birth: '1990-01-01' };

function usersServiceFalso(usuario: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(usuario) };
}

function guardianServiceFalso(esGuardian: boolean) {
  return { esGuardianDe: vi.fn().mockResolvedValue(esGuardian) };
}

// UC-ATT-05 — un test por criterio de aceptación textual.
describe('BiometricConsentService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('otorgar', () => {
    it('lanza NotFoundException si el user no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new BiometricConsentService(db as never, auditLog as never, usersServiceFalso(null) as never, guardianServiceFalso(false) as never);

      await expect(service.otorgar({ organizationId: ORG_ID, actorUserId: 'x', userId: 'no-existe' })).rejects.toThrow(NotFoundException);
    });

    it('bloquea si un menor intenta ser gestionado por alguien sin guardian_link', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new BiometricConsentService(db as never, auditLog as never, usersServiceFalso(MENOR) as never, guardianServiceFalso(false) as never);

      await expect(service.otorgar({ organizationId: ORG_ID, actorUserId: 'no-es-tutor', userId: MENOR.id })).rejects.toThrow(ForbiddenException);
    });

    it('un tutor con guardian_link sí puede otorgar para un menor (crea el registro por primera vez)', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from biometric_consent where user_id/i, rows: [] },
        { matcher: /insert into biometric_consent/i, rows: [{ id: 'bc-1', user_id: MENOR.id, consent_status: 'granted' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new BiometricConsentService(db as never, auditLog as never, usersServiceFalso(MENOR) as never, guardianServiceFalso(true) as never);

      const resultado = await service.otorgar({ organizationId: ORG_ID, actorUserId: 'tutor-1', userId: MENOR.id });

      expect(resultado.consent_status).toBe('granted');
      expect(auditLog.record).toHaveBeenCalledOnce();
    });

    it('bloquea si un adulto es gestionado por alguien más', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new BiometricConsentService(db as never, auditLog as never, usersServiceFalso(ADULTO) as never, guardianServiceFalso(false) as never);

      await expect(service.otorgar({ organizationId: ORG_ID, actorUserId: 'otro', userId: ADULTO.id })).rejects.toThrow(ForbiddenException);
    });

    it('el propio adulto puede otorgar su consentimiento; si ya existe un registro, lo actualiza', async () => {
      const existente = { id: 'bc-1', user_id: ADULTO.id, consent_status: 'revoked' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from biometric_consent where user_id/i, rows: [existente] },
        { matcher: /update biometric_consent set consent_status = 'granted'/i, rows: [{ ...existente, consent_status: 'granted' }] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new BiometricConsentService(db as never, auditLog as never, usersServiceFalso(ADULTO) as never, guardianServiceFalso(false) as never);

      const resultado = await service.otorgar({ organizationId: ORG_ID, actorUserId: ADULTO.id, userId: ADULTO.id });

      expect(resultado.consent_status).toBe('granted');
    });
  });

  describe('revocar', () => {
    it('elimina cualquier biometric_template asociado en la misma transacción (excepción deliberada al no-borrado)', async () => {
      const existente = { id: 'bc-1', user_id: ADULTO.id, consent_status: 'granted' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from biometric_consent where user_id/i, rows: [existente] },
        { matcher: /update biometric_consent set consent_status = 'revoked'/i, rows: [{ ...existente, consent_status: 'revoked' }] },
        { matcher: /delete from biometric_template/i, rows: [] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new BiometricConsentService(db as never, auditLog as never, usersServiceFalso(ADULTO) as never, guardianServiceFalso(false) as never);

      const resultado = await service.revocar({ organizationId: ORG_ID, actorUserId: ADULTO.id, userId: ADULTO.id });

      expect(resultado.consent_status).toBe('revoked');
      const llamadaDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.find(([sql]: [string]) => /delete from biometric_template/i.test(sql));
      expect(llamadaDelete).toBeDefined();
    });

    it('"niega" por primera vez (sin registro previo) crea uno revoked directamente', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from biometric_consent where user_id/i, rows: [] },
        { matcher: /insert into biometric_consent/i, rows: [{ id: 'bc-1', user_id: ADULTO.id, consent_status: 'revoked' }] },
        { matcher: /delete from biometric_template/i, rows: [] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new BiometricConsentService(db as never, auditLog as never, usersServiceFalso(ADULTO) as never, guardianServiceFalso(false) as never);

      const resultado = await service.revocar({ organizationId: ORG_ID, actorUserId: ADULTO.id, userId: ADULTO.id });

      expect(resultado.consent_status).toBe('revoked');
    });
  });

  describe('registrarTemplate', () => {
    it('no permite registrar un template sin consentimiento otorgado', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from biometric_consent where user_id .* and consent_status/i, rows: [] }]));
      const service = new BiometricConsentService(db as never, auditLog as never, usersServiceFalso(ADULTO) as never, guardianServiceFalso(false) as never);

      await expect(
        service.registrarTemplate({ organizationId: ORG_ID, actorUserId: ADULTO.id, userId: ADULTO.id, providerRef: 'ref-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('registra el template si el consentimiento está otorgado', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from biometric_consent where user_id .* and consent_status/i, rows: [{ id: 'bc-1', consent_status: 'granted' }] },
        { matcher: /insert into biometric_template/i, rows: [] },
      ];
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new BiometricConsentService(db as never, auditLog as never, usersServiceFalso(ADULTO) as never, guardianServiceFalso(false) as never);

      await expect(
        service.registrarTemplate({ organizationId: ORG_ID, actorUserId: ADULTO.id, userId: ADULTO.id, providerRef: 'ref-123' }),
      ).resolves.toBeUndefined();
    });
  });
});
