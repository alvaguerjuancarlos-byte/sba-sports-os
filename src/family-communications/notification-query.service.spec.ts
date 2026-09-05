import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { NotificationQueryService } from './notification-query.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const USER_ID = 'user-1';

// UC-FAM-02, paso 4 — un test por criterio de aceptación textual.
describe('NotificationQueryService', () => {
  it('lista solo notificaciones channel=in_app — la bandeja nunca mezcla canales de dispatch', async () => {
    const stubs: QueryStub[] = [{ matcher: /channel = 'in_app'/i, rows: [{ id: 'nl-1', channel: 'in_app' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new NotificationQueryService(db as never);

    await expect(service.listarBandeja(ORG_ID, USER_ID)).resolves.toHaveLength(1);
  });

  it('marcarLeida lanza NotFoundException si no pertenece a ese destinatario (aislamiento entre usuarios)', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /update notification_log set status/i, rows: [] }]));
    const service = new NotificationQueryService(db as never);

    await expect(service.marcarLeida(ORG_ID, USER_ID, 'nl-ajeno')).rejects.toThrow(NotFoundException);
  });

  it('descartar actualiza status=dismissed', async () => {
    const stubs: QueryStub[] = [{ matcher: /update notification_log set status/i, rows: [{ id: 'nl-1', status: 'dismissed' }] }];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new NotificationQueryService(db as never);

    await expect(service.descartar(ORG_ID, USER_ID, 'nl-1')).resolves.toMatchObject({ status: 'dismissed' });
  });
});
