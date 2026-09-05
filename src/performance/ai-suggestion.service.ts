import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { DevelopmentMapService } from './development-map.service.js';
import { MatchQueryService } from '../match-center/match-query.service.js';
import { generarSugerenciaDeterminista, tieneVolumenSuficienteParaSugerencia } from './performance.types.js';
import type { AiSuggestionPayload } from './performance.types.js';

export interface ConsultarSugerenciaInput {
  organizationId: string;
  athleteUserId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface ConsultarSugerenciaResultado {
  suggestion: AiSuggestionPayload | null;
  insufficientData: boolean;
}

// UC-PRF-03 — Consultar sugerencia de IA sobre desarrollo/posición. Ver nota de alcance en
// performance.types.ts: `generarSugerenciaDeterminista` es una función de reglas explicables, no
// una integración real de ML — mismo tratamiento que la priorización de alternos en Call-up
// Engine (UC-CUP-03).
@Injectable()
export class AiSuggestionService {
  constructor(
    private readonly db: DatabaseService,
    private readonly developmentMapService: DevelopmentMapService,
    private readonly matchQueryService: MatchQueryService,
  ) {}

  async consultar(input: ConsultarSugerenciaInput): Promise<ConsultarSugerenciaResultado> {
    // Precondición UC-PRF-03: "Existe development_map calculado (UC-PRF-01)" — lanza
    // NotFoundException si no, vía DevelopmentMapService.obtener().
    const mapa = await this.developmentMapService.obtener(input.organizationId, 'athlete', input.athleteUserId, input.dateRangeStart, input.dateRangeEnd);

    const partidosJugados = await this.matchQueryService.consultarEstadisticasDeJugadorEnRango(
      input.organizationId,
      input.athleteUserId,
      new Date(`${input.dateRangeStart}T00:00:00.000Z`),
      new Date(`${input.dateRangeEnd}T23:59:59.999Z`),
    );

    // 2a. "No hay volumen de datos suficiente → el sistema no genera ai_suggestion; muestra
    // explícitamente 'datos insuficientes para sugerencia' en vez de forzar una respuesta de baja
    // confianza."
    if (!tieneVolumenSuficienteParaSugerencia(mapa.dimensions, partidosJugados.length)) {
      return { suggestion: null, insufficientData: true };
    }

    const suggestion = generarSugerenciaDeterminista(mapa.dimensions);

    await this.db.withTenant(input.organizationId, async (client) => {
      await client.query(`update development_map set ai_suggestion = $2, updated_at = now() where id = $1`, [mapa.id, JSON.stringify(suggestion)]);
    });

    return { suggestion, insufficientData: false };
  }
}
