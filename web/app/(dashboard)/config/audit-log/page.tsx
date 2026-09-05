import { api } from '@/lib/api';
import type { AuditLogEntry } from '@/lib/types/configuration-studio';

interface Filtros {
  entityType?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
}

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  const params = new URLSearchParams();
  if (filtros.entityType) params.set('entityType', filtros.entityType);
  if (filtros.actorUserId) params.set('actorUserId', filtros.actorUserId);
  if (filtros.from) params.set('from', filtros.from);
  if (filtros.to) params.set('to', filtros.to);

  const entradas = await api.get<AuditLogEntry[]>(`/config/audit-log${params.size > 0 ? `?${params.toString()}` : ''}`);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-neutral-900">Auditoría (UC-CFG-04)</h2>
      <form className="flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-neutral-700">Tipo de entidad</span>
          <input name="entityType" defaultValue={filtros.entityType} className="rounded border border-neutral-300 px-3 py-2" placeholder="ej. product_catalog" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-700">Actor (userId)</span>
          <input name="actorUserId" defaultValue={filtros.actorUserId} className="rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-700">Desde</span>
          <input name="from" type="date" defaultValue={filtros.from} className="rounded border border-neutral-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-neutral-700">Hasta</span>
          <input name="to" type="date" defaultValue={filtros.to} className="rounded border border-neutral-300 px-3 py-2" />
        </label>
        <button type="submit" className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
          Filtrar
        </button>
      </form>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Fecha</th>
            <th className="py-2 pr-4">Entidad</th>
            <th className="py-2 pr-4">Campo</th>
            <th className="py-2 pr-4">Actor</th>
            <th className="py-2 pr-4">Antes</th>
            <th className="py-2 pr-4">Después</th>
          </tr>
        </thead>
        <tbody>
          {entradas.map((e) => (
            <tr key={e.id} className="border-b border-neutral-100 align-top">
              <td className="py-2 pr-4 whitespace-nowrap text-neutral-500">{new Date(e.occurred_at).toLocaleString('es-MX')}</td>
              <td className="py-2 pr-4">{e.entity_type}</td>
              <td className="py-2 pr-4">{e.field_changed ?? '—'}</td>
              <td className="py-2 pr-4 font-mono text-xs">{e.actor_user_id}</td>
              <td className="py-2 pr-4 font-mono text-xs break-all">{e.old_value ? JSON.stringify(e.old_value) : '—'}</td>
              <td className="py-2 pr-4 font-mono text-xs break-all">{e.new_value ? JSON.stringify(e.new_value) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {entradas.length === 0 && <p className="text-sm text-neutral-500">Sin entradas para este filtro.</p>}
    </div>
  );
}
