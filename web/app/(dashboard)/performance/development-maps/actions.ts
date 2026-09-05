'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api';
import type { DevelopmentMapScope } from '@/lib/types/performance';

export interface AccionState {
  error: string | null;
}

function rutaPara(scope: DevelopmentMapScope, scopeRefId: string) {
  if (scope === 'athlete') return `/performance/development-maps/athletes/${scopeRefId}`;
  if (scope === 'team') return `/performance/development-maps/teams/${scopeRefId}`;
  return `/performance/development-maps/academy`;
}

// UC-PRF-01/02 — generar (o regenerar) el development_map de un scope/rango. Recalcular invalida
// cualquier ai_suggestion previa — nunca queda una sugerencia sobre datos ya obsoletos.
export async function generarDevelopmentMapAction(scope: DevelopmentMapScope, _prevState: AccionState, formData: FormData): Promise<AccionState> {
  const scopeRefId = String(formData.get('scopeRefId') ?? '');
  const dateRangeStart = String(formData.get('dateRangeStart') ?? '');
  const dateRangeEnd = String(formData.get('dateRangeEnd') ?? '');

  const ruta = scope === 'academy' ? '/performance/development-maps/academy' : `/performance/development-maps/${scope === 'athlete' ? 'athletes' : 'teams'}/${scopeRefId}`;

  try {
    await api.post(ruta, { dateRangeStart, dateRangeEnd });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo generar el development map.' };
  }

  revalidatePath('/performance/development-maps');
  redirect(`${rutaPara(scope, scopeRefId)}?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}`);
}

export interface SugerenciaState {
  error: string | null;
  recommendation: string | null;
  insufficientData: boolean;
}

interface ConsultarSugerenciaResultado {
  suggestion: { recommendation: string } | null;
  insufficientData: boolean;
}

// UC-PRF-03 — se pide explícitamente, nunca se recalcula sola de forma implícita. La firma
// requiere prevState porque useActionState siempre la pasa, aunque este botón no tenga campos.
export async function consultarSugerenciaAction(
  athleteId: string,
  dateRangeStart: string,
  dateRangeEnd: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prevState: SugerenciaState,
): Promise<SugerenciaState> {
  try {
    const resultado = await api.get<ConsultarSugerenciaResultado>(
      `/performance/development-maps/athletes/${athleteId}/suggestion?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}`,
    );
    return { error: null, recommendation: resultado.suggestion?.recommendation ?? null, insufficientData: resultado.insufficientData };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'No se pudo consultar la sugerencia.', recommendation: null, insufficientData: false };
  }
}
