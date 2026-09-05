'use client';

import { useTransition } from 'react';
import { devolverAction } from './actions';
import type { InventoryCheckout } from '@/lib/types/facilities-inventory';

export function CheckoutRow({ checkout, nombreItem, nombreCheckedOutBy }: { checkout: InventoryCheckout; nombreItem: string; nombreCheckedOutBy: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{nombreItem}</td>
      <td className="py-2 pr-4">{checkout.quantity}</td>
      <td className="py-2 pr-4 text-neutral-500">{nombreCheckedOutBy}</td>
      <td className="py-2 pr-4 text-neutral-500">{new Date(checkout.checked_out_at).toLocaleString('es-MX')}</td>
      <td className="py-2 text-right">
        <button type="button" disabled={pending} onClick={() => startTransition(async () => devolverAction(checkout.id))} className="text-xs text-neutral-700 underline">
          Registrar devolución
        </button>
      </td>
    </tr>
  );
}
