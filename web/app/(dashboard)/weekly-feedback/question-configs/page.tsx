import { api } from '@/lib/api';
import { exigirSesion } from '@/lib/session';
import type { WeeklyFeedbackQuestionConfig } from '@/lib/types/weekly-coach-feedback';
import { NewConfigForm } from './new-config-form';
import { ConfigRow } from './config-row';

export default async function QuestionConfigsPage() {
  const [sesion, configs] = await Promise.all([exigirSesion(), api.get<WeeklyFeedbackQuestionConfig[]>('/weekly-coach-feedback/question-configs')]);
  const puedeGestionar = sesion.roles.includes('admin') || sesion.roles.includes('director');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Preguntas por deporte (UC-WCF-01)</h2>
        <p className="text-sm text-neutral-500">Las 3 preguntas configuradas para el deporte del equipo aparecen en la captura semanal del coach.</p>
      </div>
      {puedeGestionar && <NewConfigForm />}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Deporte</th>
            <th className="py-2 pr-4">Preguntas</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {configs.map((c) => (
            <ConfigRow key={c.id} config={c} />
          ))}
        </tbody>
      </table>
      {configs.length === 0 && <p className="text-sm text-neutral-500">Sin configuraciones todavía.</p>}
    </div>
  );
}
