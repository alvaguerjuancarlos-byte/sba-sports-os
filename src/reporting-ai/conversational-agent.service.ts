import { Injectable } from '@nestjs/common';
import { BalanceQueryService } from '../payments-billing/balance-query.service.js';
import { CalendarService } from '../calendar-rsvp/calendar.service.js';
import { CallupResponseService } from '../callup-engine/callup-response.service.js';

export interface ConsultarAgenteInput {
  organizationId: string;
  actorUserId: string;
  actorRoles: string[];
  mensaje: string;
  // Parámetros de la acción propuesta, si el mensaje la implica (ej. "declina mi convocatoria")
  // — [propuesto]: sin un motor NLU real, la extracción de entidades del texto libre no está en
  // alcance; se piden explícitos como el equivalente a lo que un NLU real habría extraído.
  callupSlotId?: string;
}

export type RespuestaAgente =
  | { tipo: 'respuesta'; texto: string; fuente: string }
  | { tipo: 'propuesta_de_accion'; texto: string; accion: 'declinar_convocatoria'; parametros: { callupSlotId: string } }
  | { tipo: 'fuera_de_scope'; texto: string };

// UC-RPT-06 — Consultar agente conversacional (chat permission-aware).
//
// [propuesto, alcance real]: sin integración de un LLM/NLU real en este repo, se implementa como
// un enrutador determinista de intención por palabra clave sobre un conjunto fijo y pequeño de
// preguntas — NO es un agente conversacional de lenguaje natural genérico. Lo que SÍ se implementa
// con código real, no simulado, es la garantía de seguridad que el UC exige explícitamente:
// - "la recuperación de contexto respeta exactamente el mismo RLS por tenant y los mismos estados
//   de dato restringido que aplicarían si el usuario navegara la UI" — cada intención delega al
//   MISMO servicio permission-aware que un endpoint HTTP normal usaría (BalanceQueryService,
//   CalendarService), nunca una query propia sin el mismo chequeo de scope.
// - "si la pregunta implica una acción que modifica datos, el agente no la ejecuta directo — la
//   presenta como propuesta que requiere confirmación explícita" — consultar() nunca ejecuta una
//   escritura; confirmarAccion() es la única vía, y llama al mismo servicio de dominio que
//   ejecutaría un humano desde la UI (CallupResponseService), nunca escritura directa a la BD.
@Injectable()
export class ConversationalAgentService {
  constructor(
    private readonly balanceQueryService: BalanceQueryService,
    private readonly calendarService: CalendarService,
    private readonly callupResponseService: CallupResponseService,
  ) {}

  async consultar(input: ConsultarAgenteInput): Promise<RespuestaAgente> {
    const mensaje = input.mensaje.toLowerCase();

    if (/declin|rechaz/.test(mensaje) && /convocatoria/.test(mensaje)) {
      if (!input.callupSlotId) {
        return { tipo: 'fuera_de_scope', texto: 'Necesito el identificador de tu convocatoria (callupSlotId) para proponer esa acción.' };
      }
      // 2a-equivalente: nunca ejecuta — solo propone. La ejecución real vive en confirmarAccion().
      return {
        tipo: 'propuesta_de_accion',
        texto: `¿Confirmas que quieres declinar tu convocatoria (${input.callupSlotId})? Esta acción requiere tu confirmación explícita.`,
        accion: 'declinar_convocatoria',
        parametros: { callupSlotId: input.callupSlotId },
      };
    }

    if (/saldo|factura|pago/.test(mensaje)) {
      try {
        // Mismo servicio permission-aware que un endpoint HTTP normal — 2a: "un coach pregunta por
        // el saldo de un atleta que no es de su equipo → el agente responde que no tiene acceso".
        const saldo = await this.balanceQueryService.consultar({
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          actorRoles: input.actorRoles,
          athleteUserId: input.actorUserId,
        });
        return { tipo: 'respuesta', texto: `Tu saldo actual es $${saldo.saldoActual}.`, fuente: 'invoice/transaction (Payments & Billing)' };
      } catch {
        return { tipo: 'fuera_de_scope', texto: 'No tengo acceso a esa información con tu rol actual.' };
      }
    }

    if (/calendario|evento|rsvp/.test(mensaje)) {
      const eventos = await this.calendarService.consultar({ organizationId: input.organizationId, actorUserId: input.actorUserId, actorRoles: input.actorRoles });
      const pendientes = eventos.filter((e) => e.miRsvp === 'pending' || e.miRsvp === null);
      return { tipo: 'respuesta', texto: `Tienes ${pendientes.length} evento(s) con RSVP pendiente de ${eventos.length} en tu calendario.`, fuente: 'event/attendance (Calendar & RSVP)' };
    }

    return { tipo: 'fuera_de_scope', texto: 'No reconozco esa pregunta — puedo ayudarte con saldo, calendario o declinar una convocatoria.' };
  }

  // Única vía de ejecución real — nunca se dispara desde consultar().
  async confirmarAccion(input: { organizationId: string; actorUserId: string; accion: 'declinar_convocatoria'; parametros: { callupSlotId: string } }) {
    if (input.accion === 'declinar_convocatoria') {
      return this.callupResponseService.responder({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        callupSlotId: input.parametros.callupSlotId,
        decision: 'declined',
      });
    }
    throw new Error(`Acción no reconocida: ${input.accion}`);
  }
}
