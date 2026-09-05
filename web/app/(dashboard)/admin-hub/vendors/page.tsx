import { api } from '@/lib/api';
import type { Vendor } from '@/lib/types/admin-hub';
import { NewVendorForm } from './new-vendor-form';
import { VendorRow } from './vendor-row';

export default async function VendorsPage() {
  const vendors = await api.get<Vendor[]>('/admin-hub/vendors');

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Proveedores (UC-ADM-06)</h2>
      <NewVendorForm />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">RFC</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {vendors.map((v) => (
            <VendorRow key={v.id} vendor={v} />
          ))}
        </tbody>
      </table>
      {vendors.length === 0 && <p className="text-sm text-neutral-500">Sin proveedores todavía.</p>}
    </div>
  );
}
