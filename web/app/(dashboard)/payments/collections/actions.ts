'use server';

import { api, ApiError } from '@/lib/api';

export interface RecordatoriosState {
  cantidad: number | null;
  error: string | null;
}

// UC-PAY-06 — disparo manual del ciclo de recordatorios sobre saldo vencido. La firma requiere
// prevState porque useActionState siempre la pasa, aunque este formulario no tenga campos.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generarRecordatoriosAction(_prevState: RecordatoriosState): Promise<RecordatoriosState> {
  try {
    const recordatorios = await api.post<unknown[]>('/payments/collections/reminders');
    return { cantidad: recordatorios.length, error: null };
  } catch (e) {
    return { cantidad: null, error: e instanceof ApiError ? e.message : 'No se pudieron generar los recordatorios.' };
  }
}
