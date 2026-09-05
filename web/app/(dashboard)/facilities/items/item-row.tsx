'use client';

import { useTransition } from 'react';
import { archivarInventoryItemAction } from './actions';
import type { InventoryItem } from '@/lib/types/facilities-inventory';

export function ItemRow({ item, nombreVenue }: { item: InventoryItem; nombreVenue: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{item.name}</td>
      <td className="py-2 pr-4 text-neutral-500">{nombreVenue}</td>
      <td className="py-2 pr-4">{item.category}</td>
      <td className="py-2 pr-4">{item.quantity_total}</td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {item.status}
        </span>
      </td>
      <td className="py-2 text-right">
        {item.status === 'active' && (
          <button type="button" disabled={pending} onClick={() => startTransition(async () => archivarInventoryItemAction(item.id))} className="text-xs text-red-600 underline">
            Archivar
          </button>
        )}
      </td>
    </tr>
  );
}
