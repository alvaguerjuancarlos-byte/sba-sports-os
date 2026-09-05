'use client';

import { useTransition } from 'react';
import { actualizarQualifyingForBlockAction, archivarDimensionAction } from './actions';
import type { FinancialDimension } from '@/lib/types/configuration-studio';

export function DimensionRow({ dimension, nombrePadre }: { dimension: FinancialDimension; nombrePadre: string | null }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{dimension.name}</td>
      <td className="py-2 pr-4 text-neutral-500">{dimension.type}</td>
      <td className="py-2 pr-4 text-neutral-500">{nombrePadre ?? '—'}</td>
      <td className="py-2 pr-4">
        <label className="flex items-center gap-1 text-xs text-neutral-600">
          <input
            type="checkbox"
            defaultChecked={dimension.is_qualifying_for_block}
            disabled={pending}
            onChange={(e) => startTransition(async () => actualizarQualifyingForBlockAction(dimension.id, e.target.checked))}
          />
          bloquea convocatoria
        </label>
      </td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${dimension.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {dimension.status}
        </span>
      </td>
      <td className="py-2 text-right">
        {dimension.status === 'active' && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => archivarDimensionAction(dimension.id))}
            className="text-xs text-red-600 underline"
          >
            Archivar
          </button>
        )}
      </td>
    </tr>
  );
}
