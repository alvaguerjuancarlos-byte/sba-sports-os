'use client';

import { useActionState } from 'react';
import { importarCsvAction } from './actions';
import type { ImportState } from './actions';

const ESTADO_INICIAL: ImportState = { resultado: null, error: null };

export function ImportForm() {
  const [state, formAction, pending] = useActionState(importarCsvAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Entidad</span>
        <select name="entidad" required defaultValue="financial-dimensions" className="w-64 rounded border border-neutral-300 px-3 py-2">
          <option value="financial-dimensions">Dimensiones financieras</option>
          <option value="product-catalog">Catálogo de productos</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">CSV (pegar contenido, no un archivo)</span>
        <textarea name="csv" required rows={8} className="w-full rounded border border-neutral-300 p-2 font-mono text-xs" placeholder="type,name,parentId&#10;class,Revenue," />
      </label>
      <button type="submit" disabled={pending} className="w-fit rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Importando…' : 'Importar'}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.resultado && (
        <div className="rounded border border-neutral-200 p-3 text-sm">
          <p>
            {state.resultado.exitosas} de {state.resultado.totalFilas} filas importadas ({state.resultado.fallidas} fallidas).
          </p>
          {state.resultado.fallidas > 0 && (
            <ul className="mt-2 list-disc pl-4 text-red-600">
              {state.resultado.resultados
                .filter((r) => !r.ok)
                .map((r) => (
                  <li key={r.fila}>
                    Fila {r.fila}: {r.error}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
