'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { archivarProductoAction } from './actions';
import type { ProductCatalogItem } from '@/lib/types/configuration-studio';

export function ProductRow({ producto }: { producto: ProductCatalogItem }) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-neutral-100">
      <td className="py-2 pr-4">{producto.name}</td>
      <td className="py-2 pr-4 font-mono text-xs text-neutral-500">{producto.product_key}</td>
      <td className="py-2 pr-4">${producto.price}</td>
      <td className="py-2 pr-4 text-neutral-500">{producto.effective_date}</td>
      <td className="py-2 text-right">
        <Link href={`/config/product-catalog/${producto.product_key}/history`} className="mr-3 text-xs text-neutral-600 underline">
          Historial
        </Link>
        <button type="button" disabled={pending} onClick={() => startTransition(async () => archivarProductoAction(producto.product_key))} className="text-xs text-red-600 underline">
          Archivar
        </button>
      </td>
    </tr>
  );
}
