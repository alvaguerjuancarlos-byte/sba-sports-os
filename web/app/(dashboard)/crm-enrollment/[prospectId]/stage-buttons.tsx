'use client';

import { useTransition } from 'react';
import { cambiarStageAction } from './actions';
import type { Prospect, ProspectStage } from '@/lib/types/crm-enrollment';

const ETAPAS: { value: ProspectStage; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'trial', label: 'Prueba' },
  { value: 'negotiation', label: 'Negociación' },
  { value: 'won', label: 'Ganado' },
  { value: 'lost', label: 'Perdido' },
];

export function StageButtons({ prospectId, stageActual }: { prospectId: string; stageActual: Prospect['stage'] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {ETAPAS.map((e) => (
        <button
          key={e.value}
          type="button"
          disabled={pending || e.value === stageActual}
          onClick={() => startTransition(async () => cambiarStageAction(prospectId, e.value))}
          className={`rounded border px-3 py-1.5 text-xs font-medium ${e.value === stageActual ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-700'} disabled:opacity-50`}
        >
          {e.label}
        </button>
      ))}
    </div>
  );
}
