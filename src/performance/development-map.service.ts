import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { PerformanceAssessmentService } from './performance-assessment.service.js';
import { RosterService } from '../sports-hub/roster.service.js';
import { TeamService } from '../sports-hub/team.service.js';
import { MatchQueryService } from '../match-center/match-query.service.js';
import { WeeklyFeedbackQueryService } from '../weekly-coach-feedback/weekly-feedback-query.service.js';
import { CheckinService } from '../attendance-realtime/checkin.service.js';
import {
  agregarDimension,
  calcularDimensionActitudSemanal,
  calcularDimensionAsistencia,
  calcularDimensionDesempeño,
  calcularDimensionRendimientoEnPartido,
} from './performance.types.js';
import type { DevelopmentDimensions, DevelopmentMapRow, DevelopmentMapScope } from './performance.types.js';

export interface GenerarParaAtletaInput {
  organizationId: string;
  athleteUserId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface GenerarParaEquipoOAcademiaInput {
  organizationId: string;
  scope: 'team' | 'academy';
  scopeRefId: string; // teamId si scope='team'; el propio organizationId si scope='academy'
  dateRangeStart: string;
  dateRangeEnd: string;
}

// UC-PRF-01/02 — Generar Development Map de un atleta / de equipo o academia. Actor: "Sistema
// (agrega); coach/admin(/director) (consume)".
@Injectable()
export class DevelopmentMapService {
  constructor(
    private readonly db: DatabaseService,
    private readonly performanceAssessmentService: PerformanceAssessmentService,
    private readonly rosterService: RosterService,
    private readonly teamService: TeamService,
    private readonly matchQueryService: MatchQueryService,
    private readonly weeklyFeedbackQueryService: WeeklyFeedbackQueryService,
    private readonly checkinService: CheckinService,
  ) {}

  async generarParaAtleta(input: GenerarParaAtletaInput): Promise<DevelopmentMapRow> {
    const dimensions = await this.calcularDimensionesDeAtleta(input.organizationId, input.athleteUserId, input.dateRangeStart, input.dateRangeEnd);
    return this.upsert(input.organizationId, 'athlete', input.athleteUserId, input.dateRangeStart, input.dateRangeEnd, dimensions);
  }

  async generarParaEquipoOAcademia(input: GenerarParaEquipoOAcademiaInput): Promise<DevelopmentMapRow> {
    const atletaIds = await this.resolverAtletasDelScope(input.organizationId, input.scope, input.scopeRefId);

    const dimensionesPorAtleta = await Promise.all(
      atletaIds.map((athleteId) => this.calcularDimensionesDeAtleta(input.organizationId, athleteId, input.dateRangeStart, input.dateRangeEnd)),
    );

    // 2a. "Un atleta del scope no tiene datos suficientes → se excluye del agregado... nunca se
    // trata como cero" — agregarDimension() ya aplica esta regla por dimensión.
    const dimensions: DevelopmentDimensions = {
      desempeño: agregarDimension(dimensionesPorAtleta.map((d) => d.desempeño)),
      rendimientoEnPartido: agregarDimension(dimensionesPorAtleta.map((d) => d.rendimientoEnPartido)),
      actitudSemanal: agregarDimension(dimensionesPorAtleta.map((d) => d.actitudSemanal)),
      asistencia: agregarDimension(dimensionesPorAtleta.map((d) => d.asistencia)),
    };

    return this.upsert(input.organizationId, input.scope, input.scopeRefId, input.dateRangeStart, input.dateRangeEnd, dimensions);
  }

  // UC-PRF-04, condensado — drill-down: leer el mapa vigente de un scope/rango específico
  // (agregado o individual, misma tabla). El "navegar del agregado al individual" lo resuelve el
  // cliente llamando esto de nuevo con scope='athlete' y el athleteId que compone el agregado.
  async obtener(organizationId: string, scope: DevelopmentMapScope, scopeRefId: string, dateRangeStart: string, dateRangeEnd: string): Promise<DevelopmentMapRow> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<DevelopmentMapRow>(
        `select * from development_map where scope = $1 and scope_ref_id = $2 and date_range_start = $3 and date_range_end = $4`,
        [scope, scopeRefId, dateRangeStart, dateRangeEnd],
      );
      const mapa = rows[0];
      if (!mapa) throw new NotFoundException('No existe un development_map para ese scope y rango — generarlo primero.');
      return mapa;
    });
  }

  // Lectura para consumidores de otros dominios (ej. Player Card, UC-PLC-01: sección de
  // "performance") — el development_map más reciente de un atleta, sin exigir un rango exacto.
  async obtenerMasRecienteDeAtleta(organizationId: string, athleteUserId: string): Promise<DevelopmentMapRow | null> {
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<DevelopmentMapRow>(
        `select * from development_map where scope = 'athlete' and scope_ref_id = $1 order by generated_at desc limit 1`,
        [athleteUserId],
      );
      return rows[0] ?? null;
    });
  }

  private async resolverAtletasDelScope(organizationId: string, scope: 'team' | 'academy', scopeRefId: string): Promise<string[]> {
    if (scope === 'team') {
      const roster = await this.rosterService.listarPorEquipo(organizationId, scopeRefId, { status: 'active' });
      return roster.filter((r) => r.role === 'player').map((r) => r.user_id);
    }

    // scope === 'academy': todos los equipos activos de la organización — un atleta con doble
    // militancia (Sports Hub, UC-SPT-03) cuenta una sola vez.
    const equipos = await this.teamService.listar(organizationId, { status: 'active' });
    const atletaIds = new Set<string>();
    for (const equipo of equipos) {
      const roster = await this.rosterService.listarPorEquipo(organizationId, equipo.id, { status: 'active' });
      for (const r of roster) {
        if (r.role === 'player') atletaIds.add(r.user_id);
      }
    }
    return [...atletaIds];
  }

  private async calcularDimensionesDeAtleta(organizationId: string, athleteUserId: string, desde: string, hasta: string): Promise<DevelopmentDimensions> {
    const desdeDate = new Date(`${desde}T00:00:00.000Z`);
    const hastaDate = new Date(`${hasta}T23:59:59.999Z`);

    const [evaluaciones, estadisticas, feedbacks, equiposDelAtleta] = await Promise.all([
      this.performanceAssessmentService.listarPorJugadorEnRango(organizationId, athleteUserId, desde, hasta),
      this.matchQueryService.consultarEstadisticasDeJugadorEnRango(organizationId, athleteUserId, desdeDate, hastaDate),
      this.weeklyFeedbackQueryService.listarPorJugadorEnRango(organizationId, athleteUserId, desde, hasta),
      this.rosterService.listarEquiposDeUsuario(organizationId, athleteUserId),
    ]);

    let totalCheckins = 0;
    for (const teamId of equiposDelAtleta) {
      totalCheckins += await this.checkinService.contarCheckinsEnRango(organizationId, athleteUserId, teamId, desdeDate, hastaDate);
    }

    return {
      desempeño: calcularDimensionDesempeño(evaluaciones),
      rendimientoEnPartido: calcularDimensionRendimientoEnPartido(estadisticas),
      actitudSemanal: calcularDimensionActitudSemanal(feedbacks),
      asistencia: calcularDimensionAsistencia(totalCheckins),
    };
  }

  private async upsert(
    organizationId: string,
    scope: DevelopmentMapScope,
    scopeRefId: string,
    dateRangeStart: string,
    dateRangeEnd: string,
    dimensions: DevelopmentDimensions,
  ): Promise<DevelopmentMapRow> {
    // Recalcular las dimensiones invalida cualquier ai_suggestion anterior — una sugerencia
    // generada sobre datos ya obsoletos violaría el mismo principio de explicabilidad que
    // UC-PRF-03 exige ("nunca como una afirmación sin respaldo"). Se vuelve a pedir explícitamente
    // (AiSuggestionService.consultar), nunca se recalcula sola de forma implícita.
    return this.db.withTenant(organizationId, async (client) => {
      const { rows } = await client.query<DevelopmentMapRow>(
        `insert into development_map (organization_id, scope, scope_ref_id, date_range_start, date_range_end, dimensions, generated_at)
         values ($1, $2, $3, $4, $5, $6, now())
         on conflict (organization_id, scope, scope_ref_id, date_range_start, date_range_end) do update set
           dimensions = excluded.dimensions,
           ai_suggestion = null,
           generated_at = now(),
           updated_at = now()
         returning *`,
        [organizationId, scope, scopeRefId, dateRangeStart, dateRangeEnd, JSON.stringify(dimensions)],
      );
      return rows[0];
    });
  }
}
