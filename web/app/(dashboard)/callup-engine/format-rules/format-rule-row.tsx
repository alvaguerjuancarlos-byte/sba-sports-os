'use client';

import { useTransition } from 'react';
import { archivarFormatRuleAction } from './actions';
import type { CallupFormatRule } from '@/lib/types/callup-engine';

export function FormatRuleRow({ rule }: { rule: CallupFormatRule }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{rule.sport}</td>
      <td className="py-2 pr-4">{rule.format}</td>
      <td className="py-2 pr-4">{rule.max_players}</td>
      <td className="py-2 pr-4">{rule.priority_window_days}</td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${rule.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {rule.status}
        </span>
      </td>
      <td className="py-2 text-right">
        {rule.status === 'active' && (
          <button type="button" disabled={pending} onClick={() => startTransition(async () => archivarFormatRuleAction(rule.id))} className="text-xs text-red-600 underline">
            Archivar
          </button>
        )}
      </td>
    </tr>
  );
}
