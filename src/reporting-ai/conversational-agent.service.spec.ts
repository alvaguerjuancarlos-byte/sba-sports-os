import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { ConversationalAgentService } from './conversational-agent.service.js';

const ORG_ID = 'org-1';
const ACTOR_ID = 'actor-1';

function balanceServiceFalso(lanzaForbidden = false) {
  return {
    consultar: lanzaForbidden ? vi.fn().mockRejectedValue(new ForbiddenException()) : vi.fn().mockResolvedValue({ saldoActual: 250, invoices: [], transactions: [] }),
  };
}
function calendarServiceFalso() {
  return { consultar: vi.fn().mockResolvedValue([{ miRsvp: 'pending' }, { miRsvp: 'confirmed' }]) };
}
function callupResponseServiceFalso() {
  return { responder: vi.fn().mockResolvedValue({ slot: { id: 'slot-1', status: 'declined' }, alternoPromovido: null }) };
}

// UC-RPT-06 — un test por criterio de aceptación textual.
describe('ConversationalAgentService', () => {
  it('responde el saldo delegando al MISMO servicio permission-aware que la UI', async () => {
    const balanceService = balanceServiceFalso();
    const service = new ConversationalAgentService(balanceService as never, calendarServiceFalso() as never, callupResponseServiceFalso() as never);

    const respuesta = await service.consultar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['player'], mensaje: '¿cuál es mi saldo?' });

    expect(respuesta.tipo).toBe('respuesta');
    expect(balanceService.consultar).toHaveBeenCalledWith(expect.objectContaining({ athleteUserId: ACTOR_ID }));
    if (respuesta.tipo === 'respuesta') expect(respuesta.fuente).toBeTruthy();
  });

  it('2a: si el servicio de origen rechaza el scope, el agente responde que no tiene acceso — nunca inventa un dato', async () => {
    const service = new ConversationalAgentService(balanceServiceFalso(true) as never, calendarServiceFalso() as never, callupResponseServiceFalso() as never);

    const respuesta = await service.consultar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['coach'], mensaje: 'saldo del atleta' });

    expect(respuesta.tipo).toBe('fuera_de_scope');
  });

  it('responde cuántos eventos tienen RSVP pendiente, vía CalendarService', async () => {
    const service = new ConversationalAgentService(balanceServiceFalso() as never, calendarServiceFalso() as never, callupResponseServiceFalso() as never);

    const respuesta = await service.consultar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['player'], mensaje: 'mi calendario' });

    expect(respuesta.tipo).toBe('respuesta');
    if (respuesta.tipo === 'respuesta') expect(respuesta.texto).toContain('1');
  });

  it('nunca ejecuta una acción que modifica datos directo — la propone y exige confirmación explícita', async () => {
    const callupResponseService = callupResponseServiceFalso();
    const service = new ConversationalAgentService(balanceServiceFalso() as never, calendarServiceFalso() as never, callupResponseService as never);

    const respuesta = await service.consultar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['player'], mensaje: 'quiero declinar mi convocatoria', callupSlotId: 'slot-1' });

    expect(respuesta.tipo).toBe('propuesta_de_accion');
    expect(callupResponseService.responder).not.toHaveBeenCalled();
  });

  it('confirmarAccion es la ÚNICA vía que ejecuta — llama al mismo servicio de dominio que usaría un humano', async () => {
    const callupResponseService = callupResponseServiceFalso();
    const service = new ConversationalAgentService(balanceServiceFalso() as never, calendarServiceFalso() as never, callupResponseService as never);

    await service.confirmarAccion({ organizationId: ORG_ID, actorUserId: ACTOR_ID, accion: 'declinar_convocatoria', parametros: { callupSlotId: 'slot-1' } });

    expect(callupResponseService.responder).toHaveBeenCalledWith(expect.objectContaining({ callupSlotId: 'slot-1', decision: 'declined' }));
  });

  it('una pregunta no reconocida regresa fuera_de_scope sin inventar una respuesta', async () => {
    const service = new ConversationalAgentService(balanceServiceFalso() as never, calendarServiceFalso() as never, callupResponseServiceFalso() as never);

    const respuesta = await service.consultar({ organizationId: ORG_ID, actorUserId: ACTOR_ID, actorRoles: ['player'], mensaje: 'cuéntame un chiste' });

    expect(respuesta.tipo).toBe('fuera_de_scope');
  });
});
