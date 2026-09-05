import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CallupQueryService } from './callup-query.service.js';
import { crearClientFalso, crearDbFalsa } from './test-helpers.js';
import type { QueryStub } from './test-helpers.js';

const ORG_ID = 'org-1';
const EVENT_ID = 'event-1';
const LIST_ID = 'list-1';

// UC-CUP-05 — un test por criterio de aceptación textual.
describe('CallupQueryService', () => {
  it('lanza NotFoundException si no existe convocatoria para el evento', async () => {
    const db = crearDbFalsa(crearClientFalso([{ matcher: /select \* from callup_list where event_id/i, rows: [] }]));
    const service = new CallupQueryService(db as never);

    await expect(
      service.consultarPorEvento({ organizationId: ORG_ID, eventId: 'no-existe', actorUserId: 'user-1', actorRoles: ['player'] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('coach consulta la lista completa de convocados', async () => {
    const slots = [{ id: 'slot-1', user_id: 'jugador-1' }, { id: 'slot-2', user_id: 'jugador-2' }];
    const stubs: QueryStub[] = [
      { matcher: /select \* from callup_list where event_id/i, rows: [{ id: LIST_ID, event_id: EVENT_ID }] },
      { matcher: /select \* from callup_slot where callup_list_id/i, rows: slots },
      { matcher: /select \* from callup_waiver where callup_slot_id/i, rows: [] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new CallupQueryService(db as never);

    const resultado = await service.consultarPorEvento({ organizationId: ORG_ID, eventId: EVENT_ID, actorUserId: 'coach-1', actorRoles: ['coach'] });

    expect(resultado.slots).toHaveLength(2);
  });

  it('familia/jugador solo ve su propio estado, nunca la lista completa', async () => {
    const slots = [{ id: 'slot-1', user_id: 'jugador-1' }, { id: 'slot-2', user_id: 'jugador-2' }];
    const stubs: QueryStub[] = [
      { matcher: /select \* from callup_list where event_id/i, rows: [{ id: LIST_ID, event_id: EVENT_ID }] },
      { matcher: /select \* from callup_slot where callup_list_id/i, rows: slots },
      { matcher: /select \* from callup_waiver where callup_slot_id/i, rows: [] },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new CallupQueryService(db as never);

    const resultado = await service.consultarPorEvento({ organizationId: ORG_ID, eventId: EVENT_ID, actorUserId: 'jugador-1', actorRoles: ['player'] });

    expect(resultado.slots).toHaveLength(1);
    expect(resultado.slots[0].user_id).toBe('jugador-1');
  });

  it('el internal_comment de un waiver nunca se expone a la vista de familia/jugador', async () => {
    const slots = [{ id: 'slot-1', user_id: 'jugador-1' }];
    const waivers = [{ id: 'waiver-1', callup_slot_id: 'slot-1', internal_comment: 'Motivo disciplinario' }];
    const stubs: QueryStub[] = [
      { matcher: /select \* from callup_list where event_id/i, rows: [{ id: LIST_ID, event_id: EVENT_ID }] },
      { matcher: /select \* from callup_slot where callup_list_id/i, rows: slots },
      { matcher: /select \* from callup_waiver where callup_slot_id/i, rows: waivers },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new CallupQueryService(db as never);

    const resultado = await service.consultarPorEvento({ organizationId: ORG_ID, eventId: EVENT_ID, actorUserId: 'jugador-1', actorRoles: ['player'] });

    expect(resultado.slots[0].waivers[0].internal_comment).toBeUndefined();
  });

  it('un admin de primer nivel (sin scope) tampoco ve el internal_comment, aunque sea staff', async () => {
    const slots = [{ id: 'slot-1', user_id: 'jugador-1' }];
    const waivers = [{ id: 'waiver-1', callup_slot_id: 'slot-1', internal_comment: 'Motivo disciplinario' }];
    const stubs: QueryStub[] = [
      { matcher: /select \* from callup_list where event_id/i, rows: [{ id: LIST_ID, event_id: EVENT_ID }] },
      { matcher: /select \* from callup_slot where callup_list_id/i, rows: slots },
      { matcher: /select \* from callup_waiver where callup_slot_id/i, rows: waivers },
    ];
    const db = crearDbFalsa(crearClientFalso(stubs));
    const service = new CallupQueryService(db as never);

    const resultado = await service.consultarPorEvento({ organizationId: ORG_ID, eventId: EVENT_ID, actorUserId: 'admin-1', actorRoles: ['admin'] });

    expect(resultado.slots[0].waivers[0].internal_comment).toBeUndefined();
  });
});
