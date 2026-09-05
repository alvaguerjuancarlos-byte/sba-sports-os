import Link from 'next/link';
import { api } from '@/lib/api';
import { listarDirectorio } from '@/lib/identity';
import type { Employee } from '@/lib/types/hr-coach-hub';
import { NewEmployeeForm } from './new-employee-form';

export default async function EmployeesPage() {
  const [empleados, directorio] = await Promise.all([api.get<Employee[]>('/hr-coach-hub/employees'), listarDirectorio()]);
  const nombrePorUsuario = new Map(directorio.map((u) => [u.user_id, u.full_name]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Expedientes de personal (UC-HR-01)</h2>
        <p className="text-sm text-neutral-500">Dato restringido — admin/director únicamente, ni el propio coach ve su expediente por esta vía.</p>
      </div>
      <NewEmployeeForm personas={directorio} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Persona</th>
            <th className="py-2 pr-4">Contrato</th>
            <th className="py-2 pr-4">Contratación</th>
            <th className="py-2 pr-4">Estado</th>
          </tr>
        </thead>
        <tbody>
          {empleados.map((e) => (
            <tr key={e.id} className="border-b border-neutral-100">
              <td className="py-2 pr-4">
                <Link href={`/hr-coach-hub/employees/${e.id}`} className="text-neutral-900 underline">
                  {e.user_id ? (nombrePorUsuario.get(e.user_id) ?? e.user_id) : 'Sin cuenta de acceso'}
                </Link>
              </td>
              <td className="py-2 pr-4">{e.contract_type}</td>
              <td className="py-2 pr-4 text-neutral-500">{e.hire_date}</td>
              <td className="py-2 pr-4">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${e.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>{e.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {empleados.length === 0 && <p className="text-sm text-neutral-500">Sin expedientes todavía.</p>}
    </div>
  );
}
