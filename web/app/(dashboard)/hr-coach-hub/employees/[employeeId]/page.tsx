import { api } from '@/lib/api';
import { exigirSesion } from '@/lib/session';
import { listarDirectorio } from '@/lib/identity';
import type { CoachObjective, Employee, PayrollInput } from '@/lib/types/hr-coach-hub';
import { PayrollSection } from './payroll-section';
import { ObjectivesSection } from './objectives-section';

export default async function EmployeeDetailPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  const sesion = await exigirSesion();
  const esHr = sesion.roles.includes('admin') || sesion.roles.includes('director');

  const [empleado, insumos, objetivos, directorio] = await Promise.all([
    api.get<Employee>(`/hr-coach-hub/employees/${employeeId}`),
    api.get<PayrollInput[]>(`/hr-coach-hub/employees/${employeeId}/payroll-inputs`),
    api.get<CoachObjective[]>(`/hr-coach-hub/employees/${employeeId}/objectives`),
    listarDirectorio(),
  ]);
  const nombrePersona = empleado.user_id ? (directorio.find((u) => u.user_id === empleado.user_id)?.full_name ?? empleado.user_id) : 'Sin cuenta de acceso';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">{nombrePersona}</h2>
        <p className="text-sm text-neutral-500">
          {empleado.contract_type} · contratado {empleado.hire_date} ·{' '}
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${empleado.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>{empleado.status}</span>
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Nómina (UC-HR-03)</h3>
        <PayrollSection employeeId={employeeId} insumos={insumos} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Objetivos (UC-HR-04)</h3>
        <ObjectivesSection employeeId={employeeId} objetivos={objetivos} puedeDefinir={esHr} />
      </div>
    </div>
  );
}
