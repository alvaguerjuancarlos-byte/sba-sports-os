import { describe, expect, it } from 'vitest';
import {
  agregarDimension,
  calcularDimensionActitudSemanal,
  calcularDimensionAsistencia,
  calcularDimensionDesempeño,
  calcularDimensionRendimientoEnPartido,
  generarSugerenciaDeterminista,
  tieneVolumenSuficienteParaSugerencia,
} from './performance.types.js';
import type { DevelopmentDimensions } from './performance.types.js';

describe('calcularDimensionDesempeño', () => {
  it('regresa sufficientData:false y value:null sin evaluaciones — nunca interpola', () => {
    expect(calcularDimensionDesempeño([])).toEqual({ value: null, sufficientData: false });
  });

  it('promedia los scores cuando hay datos', () => {
    const resultado = calcularDimensionDesempeño([{ score: '80' }, { score: '90' }]);
    expect(resultado).toEqual({ value: 85, sufficientData: true });
  });
});

describe('calcularDimensionRendimientoEnPartido', () => {
  it('regresa sufficientData:false sin partidos', () => {
    expect(calcularDimensionRendimientoEnPartido([])).toEqual({ value: null, sufficientData: false });
  });

  it('promedia goles por partido', () => {
    expect(calcularDimensionRendimientoEnPartido([{ goals: 2 }, { goals: 0 }])).toEqual({ value: 1, sufficientData: true });
  });
});

describe('calcularDimensionActitudSemanal', () => {
  it('regresa sufficientData:false si ningún feedback tiene campos capturados', () => {
    const resultado = calcularDimensionActitudSemanal([{ mood: null, attention: null, attitude: null, disposition: null, commitment: null }]);
    expect(resultado.sufficientData).toBe(false);
  });

  it('promedia solo los campos capturados (guardado parcial no rompe el cálculo)', () => {
    const resultado = calcularDimensionActitudSemanal([{ mood: 4, attention: null, attitude: null, disposition: null, commitment: null }, { mood: 2, attention: 4, attitude: null, disposition: null, commitment: null }]);
    // (4 + 2 + 4) / 3 = 3.333...
    expect(resultado.sufficientData).toBe(true);
    expect(resultado.value).toBeCloseTo(3.333, 2);
  });
});

describe('calcularDimensionAsistencia', () => {
  it('nunca marca sufficientData:false, incluso en cero — es un conteo, no un promedio', () => {
    expect(calcularDimensionAsistencia(0)).toEqual({ value: 0, sufficientData: true });
  });
});

describe('agregarDimension (UC-PRF-02)', () => {
  it('excluye del promedio a atletas sin datos suficientes, y los cuenta en excludedCount — nunca los trata como cero', () => {
    const resultado = agregarDimension([
      { value: 80, sufficientData: true },
      { value: 90, sufficientData: true },
      { value: null, sufficientData: false },
    ]);
    expect(resultado.value).toBe(85);
    expect(resultado.excludedCount).toBe(1);
  });

  it('regresa sufficientData:false si NINGÚN atleta del scope tiene datos', () => {
    const resultado = agregarDimension([{ value: null, sufficientData: false }]);
    expect(resultado).toEqual({ value: null, sufficientData: false, excludedCount: 1 });
  });
});

describe('tieneVolumenSuficienteParaSugerencia (UC-PRF-03)', () => {
  const dimensionesSuficientes: DevelopmentDimensions = {
    desempeño: { value: 80, sufficientData: true },
    rendimientoEnPartido: { value: 1, sufficientData: true },
    actitudSemanal: { value: 4, sufficientData: false },
    asistencia: { value: 3, sufficientData: true },
  };

  it('requiere al menos 2 dimensiones con datos suficientes Y al menos 1 partido jugado', () => {
    expect(tieneVolumenSuficienteParaSugerencia(dimensionesSuficientes, 1)).toBe(true);
  });

  it('no genera sugerencia si no hay ningún partido jugado, aunque las dimensiones tengan dato', () => {
    expect(tieneVolumenSuficienteParaSugerencia(dimensionesSuficientes, 0)).toBe(false);
  });

  it('no genera sugerencia con menos de 2 dimensiones con datos suficientes', () => {
    const pocasDimensiones: DevelopmentDimensions = {
      desempeño: { value: 80, sufficientData: true },
      rendimientoEnPartido: { value: null, sufficientData: false },
      actitudSemanal: { value: null, sufficientData: false },
      asistencia: { value: null, sufficientData: false },
    };
    expect(tieneVolumenSuficienteParaSugerencia(pocasDimensiones, 1)).toBe(false);
  });
});

describe('generarSugerenciaDeterminista (UC-PRF-03)', () => {
  it('nunca se genera sin las variables que la explican', () => {
    const dimensions: DevelopmentDimensions = {
      desempeño: { value: 80, sufficientData: true },
      rendimientoEnPartido: { value: 1, sufficientData: true },
      actitudSemanal: { value: 4, sufficientData: true },
      asistencia: { value: 5, sufficientData: true },
    };
    const sugerencia = generarSugerenciaDeterminista(dimensions);
    expect(Object.keys(sugerencia.variables).length).toBeGreaterThan(0);
    expect(sugerencia.recommendation).toBeTruthy();
  });

  it('es reproducible — mismas dimensiones producen siempre la misma recomendación (salvo el timestamp)', () => {
    const dimensions: DevelopmentDimensions = {
      desempeño: { value: 60, sufficientData: true },
      rendimientoEnPartido: { value: 0.5, sufficientData: true },
      actitudSemanal: { value: 2, sufficientData: true },
      asistencia: { value: 2, sufficientData: true },
    };
    const a = generarSugerenciaDeterminista(dimensions);
    const b = generarSugerenciaDeterminista(dimensions);
    expect(a.recommendation).toBe(b.recommendation);
    expect(a.variables).toEqual(b.variables);
  });
});
