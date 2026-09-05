'use server';

import { api, ApiError } from '@/lib/api';
import type { ResultadoEntradaLote } from '@/lib/types/weekly-coach-feedback';

export interface AccionState {
  error: string | null;
  resultados: ResultadoEntradaLote[] | null;
}

// UC-WCF-01 — captura por lote. Ningún campo es obligatorio a nivel de dato — se envía lo que
// venga en el form para cada jugador, el backend hace merge (coalesce) sobre lo ya guardado.
export async function capturarLoteAction(teamId: string, playerIds: string[], _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const weekEnding = String(formData.get('weekEnding') ?? '');

  const numero = (v: FormDataEntryValue | null) => (v && String(v).trim() !== '' ? Number(v) : undefined);
  const texto = (v: FormDataEntryValue | null) => (v && String(v).trim() !== '' ? String(v).trim() : undefined);

  const entradas = playerIds.map((playerId) => ({
    playerId,
    mood: numero(formData.get(`mood_${playerId}`)),
    attention: numero(formData.get(`attention_${playerId}`)),
    attitude: numero(formData.get(`attitude_${playerId}`)),
    disposition: numero(formData.get(`disposition_${playerId}`)),
    commitment: numero(formData.get(`commitment_${playerId}`)),
    dna: texto(formData.get(`dna_${playerId}`)),
    sportQuestion1: texto(formData.get(`sq1_${playerId}`)),
    sportQuestion2: texto(formData.get(`sq2_${playerId}`)),
    sportQuestion3: texto(formData.get(`sq3_${playerId}`)),
    note: texto(formData.get(`note_${playerId}`)),
  }));

  try {
    const resultados = await api.post<ResultadoEntradaLote[]>('/weekly-coach-feedback/batches', { teamId, weekEnding, entradas });
    return { error: null, resultados };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo capturar el feedback.', resultados: null };
  }
}
