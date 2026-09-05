import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CallupWaiverService } from './callup-waiver.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'coach-1';
const LIST_ID = 'list-1';
const USER_ID = 'jugador-1';

function eligibilityServiceFalso(eligible: boolean) {
  return { consultar: vi.fn().mockResolvedValue({ eligible }) };
}

// UC-CUP-04 — un test por criterio de aceptación textual.
describe('CallupWaiverService', () => {
  it('exige un comentario interno obligatorio (2a)', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new CallupWaiverService(db as never, eligibilityServiceFalso(true) as never);

    await expect(
      service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, callupListId: LIST_ID, userId: USER_ID, action: 'exclude', internalComment: '   ' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('nunca permite un waiver sobre un jugador con saldo vencido cualificante (1a) — ni exclude ni include', async () => {
    const db = crearDbFalsa(crearClientFalso([]));
    const service = new CallupWaiverService(db as never, eligibilityServiceFalso(false) as never);

    await expect(
      service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, callupListId: LIST_ID, userId: USER_ID, action: 'include', internalComment: 'Buen desempeño en pretemporada' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lanza NotFoundException si la callup_list no existe', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select id from callup_list where id/i, rows: [] }]));
    const service = new CallupWaiverService(db as never, eligibilityServiceFalso(true) as never);

    await expect(
      service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, callupListId: 'no-existe', userId: USER_ID, action: 'exclude', internalComment: 'Motivo' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('no se puede excluir a alguien que no está en la convocatoria', async () => {
    const stubs: QueryStub[] = [
      { matcher: /select id from callup_list where id/i, rows: [{ id: LIST_ID }] },
      { matcher: /select \* from callup_slot where callup_list_id/i, rows: [] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new CallupWaiverService(db as never, eligibilityServiceFalso(true) as never);

    await expect(
      service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, callupListId: LIST_ID, userId: USER_ID, action: 'exclude', internalComment: 'Motivo' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('excluye a un jugador convocado (nunca lo borra) y crea el waiver con el comentario', async () => {
    const slotLlamado = { id: 'slot-1', callup_list_id: LIST_ID, user_id: USER_ID, status: 'called' };
    const stubs: QueryStub[] = [
      { matcher: /select id from callup_list where id/i, rows: [{ id: LIST_ID }] },
      { matcher: /select \* from callup_slot where callup_list_id/i, rows: [slotLlamado] },
      { matcher: /update callup_slot set status = 'excluded'/i, rows: [{ ...slotLlamado, status: 'excluded' }] },
      { matcher: /insert into callup_waiver/i, rows: [{ id: 'waiver-1', callup_slot_id: 'slot-1', action: 'exclude', internal_comment: 'Motivo disciplinario' }] },
    ];
    const client = crearClientFalso(stubs);
    const db = crearDbFalsa(client);
    const service = new CallupWaiverService(db as never, eligibilityServiceFalso(true) as never);

    const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, callupListId: LIST_ID, userId: USER_ID, action: 'exclude', internalComment: 'Motivo disciplinario' });

    expect(resultado.slot.status).toBe('excluded');
    expect(resultado.waiver.internal_comment).toBe('Motivo disciplinario');
    const llamadasDelete = (client.query as ReturnType<typeof vi.fn>).mock.calls.filter(([sql]: [string]) => /delete/i.test(sql));
    expect(llamadasDelete).toHaveLength(0);
  });

  it('no permite incluir a alguien si ya se alcanzó el máximo de convocados del formato', async () => {
    const slotAlterno = { id: 'slot-2', callup_list_id: LIST_ID, user_id: USER_ID, status: 'alternate' };
    const stubs: QueryStub[] = [
      { matcher: /select id from callup_list where id/i, rows: [{ id: LIST_ID }] },
      { matcher: /select \* from callup_slot where callup_list_id/i, rows: [slotAlterno] },
      { matcher: /select cfr\.max_players/i, rows: [{ max_players: 2 }] },
      { matcher: /select count\(\*\) as total from callup_slot where callup_list_id .* status = 'called'/i, rows: [{ total: '2' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new CallupWaiverService(db as never, eligibilityServiceFalso(true) as never);

    await expect(
      service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, callupListId: LIST_ID, userId: USER_ID, action: 'include', internalComment: 'Decisión técnica' }),
    ).rejects.toThrow(ConflictException);
  });

  it('promueve a un alterno existente a called cuando hay cupo disponible', async () => {
    const slotAlterno = { id: 'slot-2', callup_list_id: LIST_ID, user_id: USER_ID, status: 'alternate' };
    const stubs: QueryStub[] = [
      { matcher: /select id from callup_list where id/i, rows: [{ id: LIST_ID }] },
      { matcher: /select \* from callup_slot where callup_list_id/i, rows: [slotAlterno] },
      { matcher: /select cfr\.max_players/i, rows: [{ max_players: 12 }] },
      { matcher: /select count\(\*\) as total from callup_slot where callup_list_id .* status = 'called'/i, rows: [{ total: '2' }] },
      { matcher: /update callup_slot set status = 'called' where id/i, rows: [{ ...slotAlterno, status: 'called' }] },
      { matcher: /insert into callup_waiver/i, rows: [{ id: 'waiver-1', action: 'include', internal_comment: 'Decisión técnica' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new CallupWaiverService(db as never, eligibilityServiceFalso(true) as never);

    const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, callupListId: LIST_ID, userId: USER_ID, action: 'include', internalComment: 'Decisión técnica' });

    expect(resultado.slot.status).toBe('called');
  });

  it('incluye a alguien completamente nuevo (sin slot previo) si hay cupo disponible', async () => {
    const stubs: QueryStub[] = [
      { matcher: /select id from callup_list where id/i, rows: [{ id: LIST_ID }] },
      { matcher: /select \* from callup_slot where callup_list_id/i, rows: [] },
      { matcher: /select cfr\.max_players/i, rows: [{ max_players: 12 }] },
      { matcher: /select count\(\*\) as total from callup_slot where callup_list_id .* status = 'called'/i, rows: [{ total: '5' }] },
      { matcher: /insert into callup_slot/i, rows: [{ id: 'slot-nuevo', user_id: USER_ID, status: 'called' }] },
      { matcher: /insert into callup_waiver/i, rows: [{ id: 'waiver-1', action: 'include', internal_comment: 'Refuerzo de último momento' }] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new CallupWaiverService(db as never, eligibilityServiceFalso(true) as never);

    const resultado = await service.crear({ organizationId: ORG_ID, actorUserId: ACTOR_ID, callupListId: LIST_ID, userId: USER_ID, action: 'include', internalComment: 'Refuerzo de último momento' });

    expect(resultado.slot.id).toBe('slot-nuevo');
    expect(resultado.slot.status).toBe('called');
  });
});
