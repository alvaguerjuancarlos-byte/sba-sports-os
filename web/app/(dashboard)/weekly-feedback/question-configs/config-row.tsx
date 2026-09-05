'use client';

import { useTransition } from 'react';
import { archivarQuestionConfigAction } from './actions';
import type { WeeklyFeedbackQuestionConfig } from '@/lib/types/weekly-coach-feedback';

export function ConfigRow({ config }: { config: WeeklyFeedbackQuestionConfig }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{config.sport}</td>
      <td className="py-2 pr-4 text-neutral-500">
        {config.question_1_label} / {config.question_2_label} / {config.question_3_label}
      </td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${config.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {config.status}
        </span>
      </td>
      <td className="py-2 text-right">
        {config.status === 'active' && (
          <button type="button" disabled={pending} onClick={() => startTransition(async () => archivarQuestionConfigAction(config.id))} className="text-xs text-red-600 underline">
            Archivar
          </button>
        )}
      </td>
    </tr>
  );
}
