'use server';

import { api, ApiError } from '@/lib/api';

export interface ImportarFilaResultado {
  fila: number;
  ok: boolean;
  id?: string;
  error?: string;
}

export interface ImportarLoteResultado {
  totalFilas: number;
  exitosas: number;
  fallidas: number;
  resultados: ImportarFilaResultado[];
}

export interface ImportState {
  resultado: ImportarLoteResultado | null;
  error: string | null;
}

// UC-CFG-03 — el CSV se manda como texto plano, no multipart (el backend lo espera así).
export async function importarCsvAction(_prevState: ImportState, formData: FormData): Promise<ImportState> {
  const entidad = String(formData.get('entidad') ?? '');
  const csv = String(formData.get('csv') ?? '');

  try {
    const resultado = await api.post<ImportarLoteResultado>(`/config/${entidad}/import`, { csv });
    return { resultado, error: null };
  } catch (e) {
    return { resultado: null, error: e instanceof ApiError ? e.message : 'No se pudo importar el archivo.' };
  }
}
