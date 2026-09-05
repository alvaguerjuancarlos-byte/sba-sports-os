'use client';

import { useActionState, useState, useTransition } from 'react';
import { preguntarAgenteAction, confirmarAccionAction } from './actions';
import type { AccionState } from './actions';

const ESTADO_INICIAL: AccionState = { error: null, respuesta: null };

function ConfirmButton({ callupSlotId }: { callupSlotId: string }) {
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<string | null>(null);

  return (
    <div className="mt-2 flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await confirmarAccionAction(callupSlotId);
            setResultado(r.error ?? r.respuesta?.texto ?? null);
          })
        }
        className="w-fit rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Confirmando…' : 'Sí, confirmar'}
      </button>
      {resultado && <p className="text-xs text-neutral-700">{resultado}</p>}
    </div>
  );
}

export function Chat() {
  const [state, formAction, pending] = useActionState(preguntarAgenteAction, ESTADO_INICIAL);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Mensaje</span>
          <input name="mensaje" required placeholder="¿Cuál es mi saldo?" className="w-72 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">callupSlotId (si aplica)</span>
          <input name="callupSlotId" className="w-56 rounded border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" disabled={pending} className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pending ? 'Preguntando…' : 'Preguntar'}
        </button>
      </form>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      {state.respuesta && (
        <div className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          <p>{state.respuesta.texto}</p>
          {state.respuesta.tipo === 'respuesta' && <p className="mt-1 text-xs text-neutral-400">Fuente: {state.respuesta.fuente}</p>}
          {state.respuesta.tipo === 'propuesta_de_accion' && <ConfirmButton callupSlotId={state.respuesta.parametros.callupSlotId} />}
        </div>
      )}
    </div>
  );
}
