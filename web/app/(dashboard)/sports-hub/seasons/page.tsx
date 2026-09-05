import { api } from '@/lib/api';
import type { Season } from '@/lib/types/sports-hub';
import { NewSeasonForm } from './new-season-form';
import { SeasonRow } from './season-row';

export default async function SeasonsPage() {
  const temporadas = await api.get<Season[]>('/sports-hub/seasons');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Temporadas (UC-SPT-01)</h2>
        <p className="text-sm text-neutral-500">Dos temporadas activas que se solapan nunca se bloquean — solo se avisa.</p>
      </div>
      <NewSeasonForm />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-4">Nombre</th>
            <th className="py-2 pr-4">Rango</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {temporadas.map((s) => (
            <SeasonRow key={s.id} season={s} />
          ))}
        </tbody>
      </table>
      {temporadas.length === 0 && <p className="text-sm text-neutral-500">Sin temporadas todavía.</p>}
    </div>
  );
}
