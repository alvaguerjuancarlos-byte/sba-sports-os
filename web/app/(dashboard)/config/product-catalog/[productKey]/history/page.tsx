import Link from 'next/link';
import { api } from '@/lib/api';
import type { ProductCatalogItem } from '@/lib/types/configuration-studio';

export default async function ProductHistoryPage({ params }: { params: Promise<{ productKey: string }> }) {
  const { productKey } = await params;
  const historial = await api.get<ProductCatalogItem[]>(`/config/product-catalog/${productKey}/history`);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/config/product-catalog" className="text-sm text-neutral-500 underline">
          ← Catálogo
        </Link>
        <h2 className="text-lg font-semibold text-neutral-900">
          Historial de <span className="font-mono text-base">{productKey}</span>
        </h2>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Precio</th>
            <th className="py-2 pr-4">Vigente desde</th>
            <th className="py-2 pr-4">Vigente hasta</th>
            <th className="py-2 pr-4">Estado</th>
          </tr>
        </thead>
        <tbody>
          {historial.map((v) => (
            <tr key={v.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">{v.name}</td>
              <td className="py-2 pr-4">${v.price}</td>
              <td className="py-2 pr-4">{v.effective_date}</td>
              <td className="py-2 pr-4">{v.effective_until ?? '—'}</td>
              <td className="py-2 pr-4">{v.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
