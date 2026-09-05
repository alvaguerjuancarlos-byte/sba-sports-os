import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MediaConsentService } from './media-consent.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ADULT_ID = 'adult-1';
const MINOR_ID = 'minor-1';
const GUARDIAN_ID = 'guardian-1';
const EXTRANO_ID = 'extraño-1';

function usersServiceFalso(personas: Record<string, { date_of_birth: string } | undefined>) {
  return { obtenerPorId: vi.fn((id: string) => Promise.resolve(personas[id] ?? null)) };
}
function guardianServiceFalso(esGuardian: boolean) {
  return { esGuardianDe: vi.fn().mockResolvedValue(esGuardian) };
}

const hoy = new Date();
const ADULTO = { date_of_birth: `${hoy.getFullYear() - 30}-01-01` };
const MENOR = { date_of_birth: `${hoy.getFullYear() - 10}-01-01` };

describe('MediaConsentService', () => {
  it('lanza NotFoundException si el usuario no existe', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new MediaConsentService(db as never, crearAuditLogFalso() as never, usersServiceFalso({}) as never, guardianServiceFalso(false) as never);

    await expect(service.otorgar({ organizationId: ORG_ID, actorUserId: ADULT_ID, userId: 'no-existe' })).rejects.toThrow(NotFoundException);
  });

  it('permite al propio adulto otorgar su consentimiento', async () => {
    const stubs: QueryStub[] = [
      { matcher: /select \* from media_consent where user_id/i, rows: [] },
      { matcher: /insert into media_consent/i, rows: [{ id: 'mc-1', consent_status: 'granted' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new MediaConsentService(db as never, crearAuditLogFalso() as never, usersServiceFalso({ [ADULT_ID]: ADULTO }) as never, guardianServiceFalso(false) as never);

    const resultado = await service.otorgar({ organizationId: ORG_ID, actorUserId: ADULT_ID, userId: ADULT_ID });

    expect(resultado.consent_status).toBe('granted');
  });

  it('rechaza a un tercero (no tutor) intentando otorgar consentimiento de un menor', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new MediaConsentService(db as never, crearAuditLogFalso() as never, usersServiceFalso({ [MINOR_ID]: MENOR }) as never, guardianServiceFalso(false) as never);

    await expect(service.otorgar({ organizationId: ORG_ID, actorUserId: EXTRANO_ID, userId: MINOR_ID })).rejects.toThrow(ForbiddenException);
  });

  it('permite al tutor con guardian_link vigente otorgar consentimiento del menor', async () => {
    const stubs: QueryStub[] = [
      { matcher: /select \* from media_consent where user_id/i, rows: [] },
      { matcher: /insert into media_consent/i, rows: [{ id: 'mc-1', consent_status: 'granted' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new MediaConsentService(db as never, crearAuditLogFalso() as never, usersServiceFalso({ [MINOR_ID]: MENOR }) as never, guardianServiceFalso(true) as never);

    await expect(service.otorgar({ organizationId: ORG_ID, actorUserId: GUARDIAN_ID, userId: MINOR_ID })).resolves.toMatchObject({ consent_status: 'granted' });
  });

  it('tieneConsentimientoVigente regresa false sin fila granted', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from media_consent where user_id = \$1 and consent_status/i, rows: [] }]));
    const service = new MediaConsentService(db as never, crearAuditLogFalso() as never, usersServiceFalso({}) as never, guardianServiceFalso(false) as never);

    await expect(service.tieneConsentimientoVigente(ORG_ID, ADULT_ID)).resolves.toBe(false);
  });

  describe('obtenerEstado', () => {
    it('regresa null si nunca se ha gestionado consentimiento', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from media_consent where user_id/i, rows: [] }]));
      const service = new MediaConsentService(db as never, crearAuditLogFalso() as never, usersServiceFalso({}) as never, guardianServiceFalso(false) as never);

      await expect(service.obtenerEstado(ORG_ID, ADULT_ID)).resolves.toBeNull();
    });

    it('regresa el registro existente', async () => {
      const existente = { id: 'mc-1', consent_status: 'granted' };
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from media_consent where user_id/i, rows: [existente] }]));
      const service = new MediaConsentService(db as never, crearAuditLogFalso() as never, usersServiceFalso({}) as never, guardianServiceFalso(false) as never);

      await expect(service.obtenerEstado(ORG_ID, ADULT_ID)).resolves.toMatchObject({ consent_status: 'granted' });
    });
  });
});
