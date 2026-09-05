import { api } from '@/lib/api';
import type { PanelDeAtleta } from '@/lib/types/family-communications';

export default async function FamilyPanelPage() {
  const panel = await api.get<PanelDeAtleta[]>('/family-communications/panel');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Panel familiar (UC-FAM-01)</h2>
        <p className="text-sm text-neutral-500">Agrupado por atleta — nunca mezcla saldos o calendarios entre hermanos.</p>
      </div>

      {panel.map((p) => (
        <div key={p.athleteId} className="rounded border border-neutral-200 p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-900">Atleta {p.athleteId}</h3>
          <div className="flex flex-col gap-1 text-sm text-neutral-700">
            <p>Saldo: {p.saldo.restricted || !p.saldo.data ? <span className="text-neutral-400 italic">Restringido</span> : `$${p.saldo.data.saldoActual.toFixed(2)}`}</p>
            <p>Calendario: {p.calendario.restricted || !p.calendario.data ? <span className="text-neutral-400 italic">Restringido</span> : `${p.calendario.data.events.length} evento(s)`}</p>
            <p>Galería: {p.galeria.restricted || !p.galeria.data ? <span className="text-neutral-400 italic">Restringido</span> : `${p.galeria.data.assets.length} archivo(s)`}</p>
          </div>
        </div>
      ))}
      {panel.length === 0 && <p className="text-sm text-neutral-500">Sin atletas bajo tu guardian_link todavía.</p>}
    </div>
  );
}
