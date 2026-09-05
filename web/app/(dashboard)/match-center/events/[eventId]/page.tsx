import { api, ApiError } from '@/lib/api';
import { exigirSesion } from '@/lib/session';
import { listarDirectorio } from '@/lib/identity';
import type { ConsultarEnVivoResultado, MatchLineup, PlayerStatistic } from '@/lib/types/match-center';
import type { ConsultarConvocatoriaResultado } from '@/lib/types/callup-engine';
import type { UsuarioDeDirectorio } from '@/lib/types/identity';
import { LineupForm } from './lineup-form';
import { MatchEventForm } from './match-event-form';
import { OpponentScoreForm } from './opponent-score-form';
import { CloseForm } from './close-form';

export default async function MatchCenterEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const sesion = await exigirSesion();
  const esStaff = sesion.roles.includes('admin') || sesion.roles.includes('director') || sesion.roles.includes('coach');

  const [convocatoria, lineup, usuarios] = await Promise.all([
    api.get<ConsultarConvocatoriaResultado>(`/callup-engine/events/${eventId}/callup`).catch((e) => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
    api.get<MatchLineup[]>(`/match-center/events/${eventId}/lineup`),
    esStaff ? listarDirectorio() : Promise.resolve([] as UsuarioDeDirectorio[]),
  ]);

  const enVivo = await api.get<ConsultarEnVivoResultado>(`/match-center/events/${eventId}/live`).catch((e) => {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  });

  const nombrePorUsuario = new Map(usuarios.map((u) => [u.user_id, u.full_name]));
  const aceptados = (convocatoria?.slots ?? []).filter((s) => s.status === 'accepted');
  const callupSlotIdsEnLineup = new Set(lineup.map((l) => l.callup_slot_id));
  const aceptadosSinAlinear = aceptados.filter((s) => !callupSlotIdsEnLineup.has(s.id));
  const activos = lineup.filter((l) => l.is_active);

  let estadisticas: PlayerStatistic[] = [];
  if (enVivo?.matchScore.status === 'final') {
    estadisticas = await api.get<PlayerStatistic[]>(`/match-center/events/${eventId}/statistics`);
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-neutral-900">Centro de partido (UC-MAT-01 a 05)</h2>

      {!convocatoria && <p className="text-sm text-neutral-500">Este evento todavía no tiene convocatoria — generar una en Call-up Engine primero.</p>}

      {convocatoria && !enVivo && (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-700">Alineación titular</h3>
            <ul className="mb-3 flex flex-col gap-1 text-sm text-neutral-600">
              {lineup
                .filter((l) => l.is_starter)
                .map((l) => (
                  <li key={l.id}>
                    {nombrePorUsuario.get(l.user_id) ?? l.user_id} — {l.position} ({l.formation_slot})
                  </li>
                ))}
            </ul>
            {esStaff && <LineupForm eventId={eventId} aceptados={aceptados} yaAlineados={callupSlotIdsEnLineup} nombrePorUsuario={nombrePorUsuario} />}
          </div>
        </div>
      )}

      {enVivo && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-6">
            <p className="text-2xl font-semibold text-neutral-900">
              {enVivo.matchScore.team_score} — {enVivo.matchScore.opponent_score}
            </p>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${enVivo.matchScore.status === 'live' ? 'bg-green-100 text-green-800' : 'bg-neutral-200 text-neutral-600'}`}>
              {enVivo.matchScore.status}
            </span>
          </div>

          {esStaff && enVivo.matchScore.status === 'live' && (
            <div className="flex flex-col gap-4">
              <MatchEventForm eventId={eventId} activos={activos} aceptadosSinAlinear={aceptadosSinAlinear} nombrePorUsuario={nombrePorUsuario} />
              <OpponentScoreForm eventId={eventId} actual={enVivo.matchScore.opponent_score} />
              <CloseForm eventId={eventId} />
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-700">Eventos del partido</h3>
            <ul className="flex flex-col gap-1 text-sm text-neutral-600">
              {enVivo.eventos.map((ev) => (
                <li key={ev.id}>
                  Min. {ev.minute} — {ev.type === 'goal' ? 'Gol' : ev.type === 'card' ? `Tarjeta ${ev.card_color}` : 'Sustitución'}
                </li>
              ))}
            </ul>
            {enVivo.eventos.length === 0 && <p className="text-sm text-neutral-500">Sin eventos todavía.</p>}
          </div>

          {enVivo.matchScore.status === 'final' && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-neutral-700">Estadísticas (UC-MAT-03)</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-neutral-500">
                    <th className="py-2 pr-4">Jugador</th>
                    <th className="py-2 pr-4">Minutos</th>
                    <th className="py-2 pr-4">Goles</th>
                    <th className="py-2 pr-4">Tarjetas</th>
                  </tr>
                </thead>
                <tbody>
                  {estadisticas.map((s) => (
                    <tr key={s.id} className="border-b border-neutral-100">
                      <td className="py-2 pr-4">{nombrePorUsuario.get(s.user_id) ?? s.user_id}</td>
                      <td className="py-2 pr-4">{s.minutes_played}</td>
                      <td className="py-2 pr-4">{s.goals}</td>
                      <td className="py-2 pr-4">{s.cards}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
