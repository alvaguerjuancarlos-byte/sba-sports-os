import { ImportForm } from './import-form';

export default function BulkImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Importar / exportar (UC-CFG-03)</h2>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Exportar</h3>
        <div className="flex gap-3">
          <a href="/api/config/export?entidad=financial-dimensions" className="rounded border border-neutral-300 px-3 py-1.5 text-sm">
            Dimensiones financieras (CSV)
          </a>
          <a href="/api/config/export?entidad=product-catalog" className="rounded border border-neutral-300 px-3 py-1.5 text-sm">
            Catálogo de productos (CSV)
          </a>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Importar</h3>
        <ImportForm />
      </div>
    </div>
  );
}
