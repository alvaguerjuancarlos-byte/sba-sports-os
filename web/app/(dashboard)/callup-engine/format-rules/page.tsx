import { api } from '@/lib/api';
import type { CallupFormatRule } from '@/lib/types/callup-engine';
import { NewFormatRuleForm } from './new-format-rule-form';
import { FormatRuleRow } from './format-rule-row';

export default async function FormatRulesPage() {
  const reglas = await api.get<CallupFormatRule[]>('/callup-engine/format-rules');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Reglas de formato (UC-CUP-06)</h2>
        <p className="text-sm text-neutral-500">Generar una convocatoria requiere una regla activa para el deporte/formato del equipo del evento.</p>
      </div>
      <NewFormatRuleForm />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Deporte</th>
            <th className="py-2 pr-4">Formato</th>
            <th className="py-2 pr-4">Máx.</th>
            <th className="py-2 pr-4">Ventana</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {reglas.map((r) => (
            <FormatRuleRow key={r.id} rule={r} />
          ))}
        </tbody>
      </table>
      {reglas.length === 0 && <p className="text-sm text-neutral-500">Sin reglas de formato todavía.</p>}
    </div>
  );
}
