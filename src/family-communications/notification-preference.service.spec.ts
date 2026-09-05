import { describe, expect, it } from 'vitest';
import { NotificationPreferenceService } from './notification-preference.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const USER_ID = 'user-1';

// UC-FAM-03 — un test por criterio de aceptación textual.
describe('NotificationPreferenceService', () => {
  it('configura (upsert) una preferencia por tipo+canal', async () => {
    const stubs: QueryStub[] = [{ matcher: /insert into notification_preference/i, rows: [{ id: 'np-1', channel: 'push', enabled: false }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new NotificationPreferenceService(db as never);

    const resultado = await service.configurar({ organizationId: ORG_ID, actorUserId: USER_ID, notificationType: 'rsvp_pending', channel: 'push', enabled: false });

    expect(resultado.enabled).toBe(false);
  });

  it('sin preferencia configurada, ningún canal externo se considera habilitado (nunca opt-in por omisión)', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select channel from notification_preference/i, rows: [] }]));
    const service = new NotificationPreferenceService(db as never);

    await expect(service.listarCanalesExternosHabilitados(ORG_ID, USER_ID, 'rsvp_pending')).resolves.toEqual([]);
  });

  it('lista solo los canales habilitados para ese tipo', async () => {
    const stubs: QueryStub[] = [{ matcher: /select channel from notification_preference/i, rows: [{ channel: 'email' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new NotificationPreferenceService(db as never);

    await expect(service.listarCanalesExternosHabilitados(ORG_ID, USER_ID, 'rsvp_pending')).resolves.toEqual(['email']);
  });
});
