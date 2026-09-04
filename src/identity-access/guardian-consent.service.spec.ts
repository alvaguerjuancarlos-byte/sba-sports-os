import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { GuardianConsentService } from './guardian-consent.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'tutor-1';
const LINK_ID = 'guardian-link-1';

// UC-ID-03 — el consentimiento es inmutable una vez capturado; negar deja la cuenta en pending
// indefinidamente, sin activación parcial.
describe('GuardianConsentService', () => {
  let auditLog: ReturnType<typeof crearAuditLogFalso>;

  beforeEach(() => {
    auditLog = crearAuditLogFalso();
  });

  describe('otorgarConsentimiento', () => {
    it('lanza NotFoundException si el guardian_link no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from guardian_link/i, rows: [] }]));
      const service = new GuardianConsentService(db as never, auditLog as never);

      await expect(
        service.otorgarConsentimiento({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          guardianLinkId: LINK_ID,
          privacyNoticeVersion: 'v1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('solo permite otorgar desde estado requested — es inmutable, nunca se re-otorga', async () => {
      const linkYaGranted = { id: LINK_ID, consent_status: 'granted', athlete_user_id: 'atleta-1' };
      const db = crearDbFalsa(
        crearClientFalso([{ matcher: /select \* from guardian_link/i, rows: [linkYaGranted] }]),
      );
      const service = new GuardianConsentService(db as never, auditLog as never);

      await expect(
        service.otorgarConsentimiento({
          organizationId: ORG_ID,
          actorUserId: ACTOR_ID,
          guardianLinkId: LINK_ID,
          privacyNoticeVersion: 'v1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('otorgar activa el user_tenant_role pending del atleta (player) y audita el cambio', async () => {
      const linkRequested = { id: LINK_ID, consent_status: 'requested', athlete_user_id: 'atleta-1' };
      const linkActualizado = { ...linkRequested, consent_status: 'granted' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from guardian_link/i, rows: [linkRequested] },
        { matcher: /update guardian_link\s+set consent_status = 'granted'/i, rows: [linkActualizado] },
        { matcher: /update user_tenant_role/i, rows: [] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new GuardianConsentService(db as never, auditLog as never);

      const resultado = await service.otorgarConsentimiento({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        guardianLinkId: LINK_ID,
        privacyNoticeVersion: 'v1',
      });

      expect(resultado.consent_status).toBe('granted');
      const llamadaActivarRol = (client.query as ReturnType<typeof vi.fn>).mock.calls.find(([sql]: [string]) =>
        /update user_tenant_role/i.test(sql),
      );
      expect(llamadaActivarRol).toBeDefined();
      expect(llamadaActivarRol![1]).toEqual([ORG_ID, 'atleta-1']);
      expect(auditLog.record).toHaveBeenCalledOnce();
    });
  });

  describe('negarConsentimiento', () => {
    it('lanza NotFoundException si el guardian_link no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from guardian_link/i, rows: [] }]));
      const service = new GuardianConsentService(db as never, auditLog as never);

      await expect(
        service.negarConsentimiento({ organizationId: ORG_ID, actorUserId: ACTOR_ID, guardianLinkId: LINK_ID }),
      ).rejects.toThrow(NotFoundException);
    });

    it('niega el consentimiento y deja la cuenta en pending indefinidamente — sin activación parcial', async () => {
      const linkRequested = { id: LINK_ID, consent_status: 'requested', athlete_user_id: 'atleta-1' };
      const linkRevocado = { ...linkRequested, consent_status: 'revoked' };
      const stubs: QueryStub[] = [
        { matcher: /select \* from guardian_link/i, rows: [linkRequested] },
        { matcher: /update guardian_link set consent_status = 'revoked'/i, rows: [linkRevocado] },
      ];
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new GuardianConsentService(db as never, auditLog as never);

      const resultado = await service.negarConsentimiento({
        organizationId: ORG_ID,
        actorUserId: ACTOR_ID,
        guardianLinkId: LINK_ID,
      });

      expect(resultado.consent_status).toBe('revoked');
      const llamadasActivarRol = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) =>
        /update user_tenant_role/i.test(sql),
      );
      expect(llamadasActivarRol).toHaveLength(0);
    });
  });
});
