import { describe, expect, it, vi } from 'vitest';
import { NotificationService } from './notification.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const RECIPIENT_ID = 'recipient-1';

function preferenceServiceFalso(canales: string[]) {
  return { listarCanalesExternosHabilitados: vi.fn().mockResolvedValue(canales) };
}

// UC-FAM-02 — un test por criterio de aceptación textual.
describe('NotificationService.crear', () => {
  it('3a: sin ningún canal externo habilitado, igual crea la fila in_app (la bandeja nunca queda vacía)', async () => {
    const stubs: QueryStub[] = [{ matcher: /insert into notification_log/i, rows: [{ id: 'nl-1', channel: 'in_app' }] }];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = new NotificationService(db as never, preferenceServiceFalso([]) as never);

    const resultado = await service.crear({ organizationId: ORG_ID, recipientUserId: RECIPIENT_ID, notificationType: 'rsvp_pending' });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].channel).toBe('in_app');
  });

  it('crea una fila adicional por cada canal externo habilitado', async () => {
    const client = crearClientFalso([]);
    let contador = 0;
    (client.query as ReturnType<typeof vi.fn>).mockImplementation((sql: string, params: unknown[] = []) => {
      if (/insert into notification_log/i.test(sql)) {
        contador++;
        return Promise.resolve({ rows: [{ id: `nl-${contador}`, channel: params[3] }] });
      }
      throw new Error(`Query sin stub configurado: ${sql}`);
    });
    const db = crearDbFalsa(client);
    const service = new NotificationService(db as never, preferenceServiceFalso(['push', 'email']) as never);

    const resultado = await service.crear({ organizationId: ORG_ID, recipientUserId: RECIPIENT_ID, notificationType: 'payment_reminder' });

    expect(resultado.map((r) => r.channel)).toEqual(['in_app', 'push', 'email']);
  });
});
