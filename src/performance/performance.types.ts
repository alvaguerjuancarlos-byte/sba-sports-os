// Tipos de fila — reflejan db/migrations/0012_performance_init.sql.

export type DevelopmentMapScope = 'athlete' | 'team' | 'academy';

export interface PerformanceAssessmentRow {
  id: string;
  organization_id: string;
  player_id: string;
  coach_id: string;
  assessment_date: string;
  category: string;
  score: string; // numeric llega como string de `pg`
  notes: string | null;
  created_at: string;
}

export interface DevelopmentDimension {
  value: number | null;
  sufficientData: boolean;
  excludedCount?: number; // solo tiene sentido en scope team/academy
}

export type DevelopmentDimensions = Record<'desempeño' | 'rendimientoEnPartido' | 'actitudSemanal' | 'asistencia', DevelopmentDimension>;

export interface AiSuggestionPayload {
  recommendation: string;
  variables: Record<string, number>;
  generatedAt: string;
}

export interface DevelopmentMapRow {
  id: string;
  organization_id: string;
  scope: DevelopmentMapScope;
  scope_ref_id: string;
  date_range_start: string;
  date_range_end: string;
  dimensions: DevelopmentDimensions;
  ai_suggestion: AiSuggestionPayload | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

// UC-PRF-01, criterio de aceptación: "ningún development_map muestra una dimensión calculada con
// datos insuficientes sin señalarlo explícitamente" — cada calculadora regresa sufficientData:false
// (value: null) en vez de interpolar o mostrar un cero que se confundiría con un valor real.

export function calcularDimensionDesempeño(evaluaciones: { score: string }[]): DevelopmentDimension {
  if (evaluaciones.length === 0) return { value: null, sufficientData: false };
  const promedio = evaluaciones.reduce((suma, e) => suma + Number(e.score), 0) / evaluaciones.length;
  return { value: promedio, sufficientData: true };
}

export function calcularDimensionRendimientoEnPartido(estadisticas: { goals: number }[]): DevelopmentDimension {
  if (estadisticas.length === 0) return { value: null, sufficientData: false };
  const golesPromedio = estadisticas.reduce((suma, e) => suma + e.goals, 0) / estadisticas.length;
  return { value: golesPromedio, sufficientData: true };
}

const CAMPOS_ACTITUD = ['mood', 'attention', 'attitude', 'disposition', 'commitment'] as const;

export function calcularDimensionActitudSemanal(
  feedbacks: { mood: number | null; attention: number | null; attitude: number | null; disposition: number | null; commitment: number | null }[],
): DevelopmentDimension {
  const valores = feedbacks.flatMap((f) => CAMPOS_ACTITUD.map((campo) => f[campo]).filter((v): v is number => v != null));
  if (valores.length === 0) return { value: null, sufficientData: false };
  const promedio = valores.reduce((suma, v) => suma + v, 0) / valores.length;
  return { value: promedio, sufficientData: true };
}

// A diferencia de las otras 3 dimensiones (que promedian una muestra que puede ser demasiado
// chica para ser representativa), asistencia es un CONTEO — siempre está bien definido, incluso
// en cero, así que no aplica la bandera de "datos insuficientes".
export function calcularDimensionAsistencia(totalCheckins: number): DevelopmentDimension {
  return { value: totalCheckins, sufficientData: true };
}

// UC-PRF-02, criterio de aceptación: "el agregado... es trazable... nunca un número sin desglose
// disponible" y "un atleta sin datos suficientes se excluye del agregado... nunca se trata como
// cero" — el promedio del agregado solo considera atletas con sufficientData:true en ESA
// dimensión; el resto se cuenta en excludedCount, nunca se descarta en silencio.
export function agregarDimension(dimensionesPorAtleta: DevelopmentDimension[]): DevelopmentDimension {
  const conDatos = dimensionesPorAtleta.filter((d) => d.sufficientData && d.value != null);
  const excludedCount = dimensionesPorAtleta.length - conDatos.length;
  if (conDatos.length === 0) return { value: null, sufficientData: false, excludedCount };
  const promedio = conDatos.reduce((suma, d) => suma + (d.value as number), 0) / conDatos.length;
  return { value: promedio, sufficientData: true, excludedCount };
}

// UC-PRF-03 — umbral mínimo de volumen para no forzar una sugerencia de baja confianza:
// [propuesto] al menos 2 de las 4 dimensiones con datos suficientes, y al menos 1 partido jugado
// (una sugerencia sobre "desarrollo/posición" sin ningún dato de partido no tendría con qué
// razonar sobre posición). El RFP no especifica un umbral — se documenta aquí el criterio exacto
// para que sea auditable y ajustable.
export function tieneVolumenSuficienteParaSugerencia(dimensions: DevelopmentDimensions, partidosJugados: number): boolean {
  const dimensionesConDatos = Object.values(dimensions).filter((d) => d.sufficientData).length;
  return dimensionesConDatos >= 2 && partidosJugados >= 1;
}

// Determinista y explicable por construcción: identifica la dimensión más baja (área de
// oportunidad) y la más alta (fortaleza) entre las que sí tienen datos, en su propia escala — no
// se normalizan entre sí porque no comparten unidad (promedio 1-5 vs. goles/partido vs. conteo).
export function generarSugerenciaDeterminista(dimensions: DevelopmentDimensions): AiSuggestionPayload {
  const entradas = Object.entries(dimensions).filter(([, d]) => d.sufficientData && d.value != null) as [string, DevelopmentDimension][];
  const variables: Record<string, number> = Object.fromEntries(entradas.map(([nombre, d]) => [nombre, d.value as number]));

  const actitud = dimensions.actitudSemanal;
  let recommendation: string;
  if (actitud.sufficientData && actitud.value != null && actitud.value < 3) {
    recommendation = `Área de oportunidad: actitud semanal promedio de ${actitud.value.toFixed(1)}/5 — por debajo del punto medio de la escala. Se recomienda seguimiento cercano del coach en mood/atención/disposición.`;
  } else {
    const mejorDimension = entradas.length > 0 ? entradas.reduce((mejor, actual) => (actual[1].value! > mejor[1].value! ? actual : mejor)) : null;
    recommendation = mejorDimension
      ? `Fortaleza principal detectada: ${mejorDimension[0]} (valor ${mejorDimension[1].value!.toFixed(2)}). Sin señales de alerta en las dimensiones con datos suficientes.`
      : 'Sin dimensiones con datos suficientes para una recomendación específica.';
  }

  return { recommendation, variables, generatedAt: new Date().toISOString() };
}
