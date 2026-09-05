'use client';

import { useTransition } from 'react';
import { archivarVendorAction } from './actions';
import type { Vendor } from '@/lib/types/admin-hub';

export function VendorRow({ vendor }: { vendor: Vendor }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{vendor.name}</td>
      <td className="py-2 pr-4 text-neutral-500">{vendor.tax_id ?? '—'}</td>
      <td className="py-2 pr-4">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${vendor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {vendor.status}
        </span>
      </td>
      <td className="py-2 text-right">
        {vendor.status === 'active' && (
          <button type="button" disabled={pending} onClick={() => startTransition(async () => archivarVendorAction(vendor.id))} className="text-xs text-red-600 underline">
            Archivar
          </button>
        )}
      </td>
    </tr>
  );
}
