import Link from 'next/link';
import { api } from '@/lib/api';
import type { Prospect } from '@/lib/types/crm-enrollment';
import { NewProspectForm } from './new-prospect-form';

const ETIQUETA_STAGE: Record<Prospect['stage'], string> = {
  lead: 'Lead',
  trial: 'Prueba',
  negotiation: 'Negociación',
  won: 'Ganado',
  lost: 'Perdido',
};

const ESTILO_STAGE: Record<Prospect['stage'], string> = {
  lead: 'bg-neutral-200 text-neutral-700',
  trial: 'bg-blue-100 text-blue-800',
  negotiation: 'bg-amber-100 text-amber-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

export default async function CrmEnrollmentPage() {
  const prospectos = await api.get<Prospect[]>('/crm-enrollment/prospects');

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Prospectos (UC-CRM-01)</h2>
      <NewProspectForm />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Contacto</th>
            <th className="py-2 pr-4">Origen</th>
            <th className="py-2 pr-4">Etapa</th>
          </tr>
        </thead>
        <tbody>
          {prospectos.map((p) => (
            <tr key={p.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">
                <Link href={`/crm-enrollment/${p.id}`} className="text-neutral-900 underline">
                  {p.name}
                </Link>
              </td>
              <td className="py-2 pr-4 text-neutral-500">{p.contact_info}</td>
              <td className="py-2 pr-4 text-neutral-500">{p.source}</td>
              <td className="py-2 pr-4">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${ESTILO_STAGE[p.stage]}`}>{ETIQUETA_STAGE[p.stage]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {prospectos.length === 0 && <p className="text-sm text-neutral-500">Sin prospectos todavía.</p>}
    </div>
  );
}
