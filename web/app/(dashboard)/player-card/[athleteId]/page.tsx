import { api, ApiError } from '@/lib/api';
import { exigirSesion } from '@/lib/session';
import type { PlayerCardResultado } from '@/lib/types/player-card';
import { MedicalNutritionForms } from './medical-nutrition-forms';

function Restringida() {
  return <p className="text-sm text-neutral-400 italic">Restringido</p>;
}

export default async function PlayerCardPage({ params }: { params: Promise<{ athleteId: string }> }) {
  const { athleteId } = await params;
  const sesion = await exigirSesion();
  const puedeEditarSensible = sesion.roles.includes('admin') || sesion.roles.includes('director');

  let card: PlayerCardResultado;
  try {
    card = await api.get<PlayerCardResultado>(`/player-card/athletes/${athleteId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      return <p className="text-sm text-red-600">No tienes ninguna relación con este atleta que dé acceso a su Player Card.</p>;
    }
    throw e;
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Player Card (UC-PLC-01)</h2>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Administrativo</h3>
        {card.administrativo.restricted || !card.administrativo.data ? (
          <Restringida />
        ) : (
          <div className="text-sm text-neutral-700">
            <p>{card.administrativo.data.user.full_name}</p>
            <p className="text-neutral-500">
              {card.administrativo.data.user.email ?? card.administrativo.data.user.phone} · nacido {card.administrativo.data.user.date_of_birth}
            </p>
            <p className="text-neutral-500">Roles: {card.administrativo.data.roles.map((r) => r.role).join(', ')}</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Deportivo</h3>
        {card.deportivo.restricted || !card.deportivo.data ? (
          <Restringida />
        ) : (
          <ul className="text-sm text-neutral-700">
            {card.deportivo.data.teams.filter(Boolean).map((t) => (
              <li key={t!.id}>
                {t!.name} — {t!.category} · {t!.sport}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Performance</h3>
        {card.performance.restricted || !card.performance.data ? (
          <Restringida />
        ) : (
          <div className="text-sm text-neutral-700">
            <p>{card.performance.data.assessments.length} evaluación(es) · {card.performance.data.matchStatistics.length} partido(s) con estadística</p>
            {card.performance.data.developmentMap && (
              <ul className="mt-2 text-neutral-600">
                {Object.entries(card.performance.data.developmentMap.dimensions).map(([nombre, d]) => (
                  <li key={nombre}>
                    {nombre}: {d.sufficientData && d.value != null ? d.value.toFixed(2) : 'datos insuficientes'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Asistencia</h3>
        {card.asistencia.restricted || !card.asistencia.data ? <Restringida /> : <p className="text-sm text-neutral-700">{card.asistencia.data.checkins.length} check-in(s) registrado(s)</p>}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Calendario</h3>
        {card.calendario.restricted || !card.calendario.data ? <Restringida /> : <p className="text-sm text-neutral-700">{card.calendario.data.events.length} evento(s) próximos/pasados</p>}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Pagos</h3>
        {card.pagos.restricted || !card.pagos.data ? <Restringida /> : <p className="text-sm text-neutral-700">Saldo actual: ${card.pagos.data.saldoActual.toFixed(2)}</p>}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Médico</h3>
        {card.medico.restricted || !card.medico.data ? (
          <Restringida />
        ) : (
          <ul className="text-sm text-neutral-700">
            {card.medico.data.notes.map((n) => (
              <li key={n.id}>
                {n.note_type}: {n.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Nutrición</h3>
        {card.nutricion.restricted || !card.nutricion.data ? (
          <Restringida />
        ) : (
          <ul className="text-sm text-neutral-700">
            {card.nutricion.data.notes.map((n) => (
              <li key={n.id}>{n.note}</li>
            ))}
          </ul>
        )}
      </div>

      {puedeEditarSensible && !card.medico.restricted && <MedicalNutritionForms athleteId={athleteId} />}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-700">Galería</h3>
        {card.galeria.restricted || !card.galeria.data ? (
          <Restringida />
        ) : (
          <p className="text-sm text-neutral-700">{card.galeria.data.assets.length} archivo(s)</p>
        )}
      </div>
    </div>
  );
}
