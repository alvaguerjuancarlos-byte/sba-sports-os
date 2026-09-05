import { api } from '@/lib/api';
import type { FinancialDimension, ProductCatalogItem } from '@/lib/types/configuration-studio';
import { NewProductForm } from './new-product-form';
import { ProductRow } from './product-row';

export default async function ProductCatalogPage() {
  const [productos, dimensiones] = await Promise.all([
    api.get<ProductCatalogItem[]>('/config/product-catalog'),
    api.get<FinancialDimension[]>('/config/financial-dimensions'),
  ]);
  const dimensionesActivas = dimensiones.filter((d) => d.status === 'active');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Catálogo de productos (UC-CFG-02)</h2>
        <p className="text-sm text-neutral-500">
          El catálogo activo siempre refleja solo la versión vigente de cada producto — crear una nueva versión archiva la anterior.
        </p>
      </div>
      <NewProductForm dimensionesActivas={dimensionesActivas} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Clave</th>
            <th className="py-2 pr-4">Precio</th>
            <th className="py-2 pr-4">Vigente desde</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <ProductRow key={p.id} producto={p} />
          ))}
        </tbody>
      </table>
      {productos.length === 0 && <p className="text-sm text-neutral-500">Sin productos activos todavía.</p>}
    </div>
  );
}
