import { describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CallupResponseService } from './callup-response.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const SLOT_ID = 'slot-1';
const MENOR = { id: 'menor-1', date_of_birth: '2015-01-01' };
const ADULTO = { id: 'adulto-1', date_of_birth: '1990-01-01' };

function usersServiceFalso(usuario: Record<string, unknown> | null) {
  return { obtenerPorId: vi.fn().mockResolvedValue(usuario) };
}
function guardianServiceFalso(esGuardian: boolean) {
  return { esGuardianDe: vi.fn().mockResolvedValue(esGuardian) };
}
function eligibilityServiceFalso(eligible: boolean) {
  return { consultar: vi.fn().mockResolvedValue({ eligible, blockingInvoiceId: eligible ? undefined : 'inv-1', paymentLink: eligible ? undefined : '/pay/inv-1' }) };
}
function priorityServiceFalso(promovido: Record<string, unknown> | null) {
  return { promoverSiguienteAlterno: vi.fn().mockResolvedValue(promovido) };
}

// UC-CUP-02 — un test por criterio de aceptación textual.
describe('CallupResponseService', () => {
  it('lanza NotFoundException si el slot no existe', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from callup_slot where id/i, rows: [] }]));
    const service = new CallupResponseService(db as never, usersServiceFalso(null) as never, guardianServiceFalso(false) as never, eligibilityServiceFalso(true) as never, priorityServiceFalso(null) as never);

    await expect(service.responder({ organizationId: ORG_ID, actorUserId: ADULTO.id, callupSlotId: 'no-existe', decision: 'accepted' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza responder un slot que ya no está pendiente (status != called)', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from callup_slot where id/i, rows: [{ id: SLOT_ID, user_id: ADULTO.id, status: 'accepted' }] }]));
    const service = new CallupResponseService(db as never, usersServiceFalso(ADULTO) as never, guardianServiceFalso(false) as never, eligibilityServiceFalso(true) as never, priorityServiceFalso(null) as never);

    await expect(service.responder({ organizationId: ORG_ID, actorUserId: ADULTO.id, callupSlotId: SLOT_ID, decision: 'accepted' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('bloquea si un menor es respondido por alguien sin guardian_link', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from callup_slot where id/i, rows: [{ id: SLOT_ID, user_id: MENOR.id, status: 'called' }] }]));
    const service = new CallupResponseService(db as never, usersServiceFalso(MENOR) as never, guardianServiceFalso(false) as never, eligibilityServiceFalso(true) as never, priorityServiceFalso(null) as never);

    await expect(service.responder({ organizationId: ORG_ID, actorUserId: 'no-es-tutor', callupSlotId: SLOT_ID, decision: 'accepted' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('bloquea si un adulto es respondido por alguien más', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from callup_slot where id/i, rows: [{ id: SLOT_ID, user_id: ADULTO.id, status: 'called' }] }]));
    const service = new CallupResponseService(db as never, usersServiceFalso(ADULTO) as never, guardianServiceFalso(false) as never, eligibilityServiceFalso(true) as never, priorityServiceFalso(null) as never);

    await expect(service.responder({ organizationId: ORG_ID, actorUserId: 'otro', callupSlotId: SLOT_ID, decision: 'accepted' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('reevalúa la elegibilidad en tiempo real — bloquea si se volvió inelegible desde UC-CUP-01 (2a)', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from callup_slot where id/i, rows: [{ id: SLOT_ID, user_id: ADULTO.id, status: 'called' }] }]));
    const service = new CallupResponseService(db as never, usersServiceFalso(ADULTO) as never, guardianServiceFalso(false) as never, eligibilityServiceFalso(false) as never, priorityServiceFalso(null) as never);

    await expect(service.responder({ organizationId: ORG_ID, actorUserId: ADULTO.id, callupSlotId: SLOT_ID, decision: 'accepted' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('el propio jugador adulto puede aceptar — no dispara promoción de alternos', async () => {
    const slot = { id: SLOT_ID, user_id: ADULTO.id, status: 'called', callup_list_id: 'list-1' };
    const stubs: QueryStub[] = [
      { matcher: /select \* from callup_slot where id/i, rows: [slot] },
      { matcher: /update callup_slot set status = \$2/i, rows: [{ ...slot, status: 'accepted' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const priority = priorityServiceFalso(null);
    const service = new CallupResponseService(db as never, usersServiceFalso(ADULTO) as never, guardianServiceFalso(false) as never, eligibilityServiceFalso(true) as never, priority as never);

    const resultado = await service.responder({ organizationId: ORG_ID, actorUserId: ADULTO.id, callupSlotId: SLOT_ID, decision: 'accepted' });

    expect(resultado.slot.status).toBe('accepted');
    expect(resultado.alternoPromovido).toBeNull();
    expect(priority.promoverSiguienteAlterno).not.toHaveBeenCalled();
  });

  it('al declinar, promueve automáticamente al siguiente alterno (5)', async () => {
    const slot = { id: SLOT_ID, user_id: ADULTO.id, status: 'called', callup_list_id: 'list-1' };
    const stubs: QueryStub[] = [
      { matcher: /select \* from callup_slot where id/i, rows: [slot] },
      { matcher: /update callup_slot set status = \$2/i, rows: [{ ...slot, status: 'declined' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const priority = priorityServiceFalso({ id: 'slot-2', user_id: 'alterno-1', status: 'called' });
    const service = new CallupResponseService(db as never, usersServiceFalso(ADULTO) as never, guardianServiceFalso(false) as never, eligibilityServiceFalso(true) as never, priority as never);

    const resultado = await service.responder({ organizationId: ORG_ID, actorUserId: ADULTO.id, callupSlotId: SLOT_ID, decision: 'declined' });

    expect(resultado.alternoPromovido?.user_id).toBe('alterno-1');
    expect(priority.promoverSiguienteAlterno).toHaveBeenCalledWith(ORG_ID, 'list-1');
  });
});
