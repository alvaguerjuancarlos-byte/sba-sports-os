'use client';

import { useActionState } from 'react';
import { capturarLoteAction } from './actions';
import type { AccionState } from './actions';
import type { WeeklyFeedbackQuestionConfig } from '@/lib/types/weekly-coach-feedback';
import type { UsuarioDeDirectorio } from '@/lib/types/identity';

const ESTADO_INICIAL: AccionState = { error: null, resultados: null };

const ESCALA = [1, 2, 3, 4, 5];

export function CaptureForm({ teamId, jugadores, config }: { teamId: string; jugadores: UsuarioDeDirectorio[]; config: WeeklyFeedbackQuestionConfig | null }) {
  const playerIds = jugadores.map((j) => j.user_id);
  const accion = capturarLoteAction.bind(null, teamId, playerIds);
  const [state, formAction, pending] = useActionState(accion, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <label className="flex w-fit flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Semana que termina</span>
        <input name="weekEnding" type="date" required className="rounded border border-neutral-300 px-3 py-2" />
      </label>

      {!config && <p className="text-sm text-amber-700">Sin configuración de preguntas para el deporte de este equipo — las 3 preguntas quedarán vacías.</p>}

      <div className="flex flex-col gap-4">
        {jugadores.map((j) => {
          const resultado = state.resultados?.find((r) => r.playerId === j.user_id);
          return (
            <div key={j.user_id} className="rounded border border-neutral-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium text-neutral-900">{j.full_name}</h4>
                {resultado && (
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${resultado.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {resultado.ok ? 'Guardado' : resultado.error}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {(['mood', 'attention', 'attitude', 'disposition', 'commitment'] as const).map((campo) => (
                  <label key={campo} className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-neutral-600 capitalize">{campo}</span>
                    <select name={`${campo}_${j.user_id}`} defaultValue="" className="rounded border border-neutral-300 px-2 py-1">
                      <option value="">—</option>
                      {ESCALA.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <label className="mt-2 flex flex-col gap-1 text-xs">
                <span className="font-medium text-neutral-600">DNA</span>
                <input name={`dna_${j.user_id}`} className="rounded border border-neutral-300 px-2 py-1" />
              </label>
              {config && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-neutral-600">{config.question_1_label}</span>
                    <input name={`sq1_${j.user_id}`} className="rounded border border-neutral-300 px-2 py-1" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-neutral-600">{config.question_2_label}</span>
                    <input name={`sq2_${j.user_id}`} className="rounded border border-neutral-300 px-2 py-1" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-medium text-neutral-600">{config.question_3_label}</span>
                    <input name={`sq3_${j.user_id}`} className="rounded border border-neutral-300 px-2 py-1" />
                  </label>
                </div>
              )}
              <label className="mt-2 flex flex-col gap-1 text-xs">
                <span className="font-medium text-neutral-600">Nota</span>
                <input name={`note_${j.user_id}`} className="w-full rounded border border-neutral-300 px-2 py-1" />
              </label>
            </div>
          );
        })}
      </div>

      <button type="submit" disabled={pending} className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Guardando…' : 'Guardar lote'}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
