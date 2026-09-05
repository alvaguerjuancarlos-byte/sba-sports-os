import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GalleryService } from './gallery.service.js';
import { crearAuditLogFalso, crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'coach-1';
const ATHLETE_ID = 'athlete-1';

function mediaConsentServiceFalso(tieneConsentimiento: boolean) {
  return { tieneConsentimientoVigente: vi.fn().mockResolvedValue(tieneConsentimiento) };
}

// UC-PLC-03 — un test por criterio de aceptación textual.
describe('GalleryService', () => {
  describe('subir', () => {
    it('rechaza subir un asset de un atleta sin consentimiento de medios vigente', async () => {
      const db = crearDbFalsa(crearClientFalso([]));
      const service = new GalleryService(db as never, crearAuditLogFalso() as never, mediaConsentServiceFalso(false) as never);

      await expect(
        service.subir({ organizationId: ORG_ID, actorUserId: ACTOR_ID, scope: 'athlete', scopeRefId: ATHLETE_ID, assetUrl: 'https://x/y.jpg', assetType: 'photo' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sube el asset y lo audita cuando hay consentimiento vigente', async () => {
      const stubs: QueryStub[] = [{ matcher: /insert into gallery_asset/i, rows: [{ id: 'ga-1', scope: 'athlete', scope_ref_id: ATHLETE_ID }] }];
      const auditLog = crearAuditLogFalso();
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new GalleryService(db as never, auditLog as never, mediaConsentServiceFalso(true) as never);

      const resultado = await service.subir({ organizationId: ORG_ID, actorUserId: ACTOR_ID, scope: 'athlete', scopeRefId: ATHLETE_ID, assetUrl: 'https://x/y.jpg', assetType: 'photo' });

      expect(resultado.id).toBe('ga-1');
      expect(auditLog.record).toHaveBeenCalledOnce();
    });

    it('un asset de scope=team no exige consentimiento individual', async () => {
      const stubs: QueryStub[] = [{ matcher: /insert into gallery_asset/i, rows: [{ id: 'ga-1', scope: 'team' }] }];
      const mediaConsent = mediaConsentServiceFalso(false);
      const db = crearDbFalsa(crearClientFalso(stubs));
      const service = new GalleryService(db as never, crearAuditLogFalso() as never, mediaConsent as never);

      await expect(
        service.subir({ organizationId: ORG_ID, actorUserId: ACTOR_ID, scope: 'team', scopeRefId: 'team-1', assetUrl: 'https://x/y.jpg', assetType: 'photo' }),
      ).resolves.toMatchObject({ id: 'ga-1' });
      expect(mediaConsent.tieneConsentimientoVigente).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('lanza NotFoundException si no existe', async () => {
      const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from gallery_asset where id/i, rows: [] }]));
      const service = new GalleryService(db as never, crearAuditLogFalso() as never, mediaConsentServiceFalso(true) as never);

      await expect(service.eliminar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, assetId: 'no-existe' })).rejects.toThrow(NotFoundException);
    });

    it('archiva (active=false) en vez de borrar físicamente, y audita', async () => {
      const stubs: QueryStub[] = [
        { matcher: /select \* from gallery_asset where id/i, rows: [{ id: 'ga-1', active: true }] },
        { matcher: /update gallery_asset set active = false/i, rows: [{ id: 'ga-1', active: false }] },
      ];
      const auditLog = crearAuditLogFalso();
      const client = crearClientFalso(stubs);
      const db = crearDbFalsa(client);
      const service = new GalleryService(db as never, auditLog as never, mediaConsentServiceFalso(true) as never);

      const resultado = await service.eliminar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, assetId: 'ga-1' });

      expect(resultado.active).toBe(false);
      expect(auditLog.record).toHaveBeenCalledOnce();
      const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /^delete/i.test(sql.trim()));
      expect(llamadasDelete).toHaveLength(0);
    });
  });
});
