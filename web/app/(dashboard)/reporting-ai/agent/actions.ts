'use server';

import { api, ApiError } from '@/lib/api';
import type { RespuestaAgente } from '@/lib/types/reporting-ai';

export interface AccionState {
  error: string | null;
  respuesta: RespuestaAgente | null;
}

// UC-RPT-06 — consultar; nunca ejecuta una acción, solo responde o propone.
export async function preguntarAgenteAction(_prevState: AccionState, formData: FormData): Promise<AccionState> {
  const mensaje = String(formData.get('mensaje') ?? '').trim();
  const callupSlotId = String(formData.get('callupSlotId') ?? '').trim();

  try {
    const respuesta = await api.post<RespuestaAgente>('/reporting-ai/agent/ask', { mensaje, callupSlotId: callupSlotId || undefined });
    return { error: null, respuesta };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo consultar al agente.', respuesta: null };
  }
}

// Única vía de ejecución real de una acción propuesta — requiere confirmación explícita separada.
export async function confirmarAccionAction(callupSlotId: string): Promise<AccionState> {
  try {
    await api.post('/reporting-ai/agent/confirm', { accion: 'declinar_convocatoria', parametros: { callupSlotId } });
    return { error: null, respuesta: { tipo: 'respuesta', texto: 'Convocatoria declinada.', fuente: 'Call-up Engine' } };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo confirmar la acción.', respuesta: null };
  }
}
