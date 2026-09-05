import { describe, expect, it } from 'vitest';
import { calcularForecast, calcularUnitEconomics, generarResumenEjecutivo } from './reporting-ai.types.js';
import type { DashboardParaResumen } from './reporting-ai.types.js';

describe('calcularForecast', () => {
  it('proyecta linealmente el ritmo de gasto observado sobre los días restantes del periodo', () => {
    const resultado = calcularForecast({ amountBudgeted: 1000, actualAmount: 300, diasTranscurridosDelPeriodo: 10, diasTotalesDelPeriodo: 30 });
    expect(resultado.ritmoDiario).toBe(30);
    expect(resultado.proyeccionAlCierre).toBe(900);
    expect(resultado.excedePresupuesto).toBe(false);
  });

  it('señala cuando la proyección excede el presupuesto', () => {
    const resultado = calcularForecast({ amountBudgeted: 500, actualAmount: 300, diasTranscurridosDelPeriodo: 10, diasTotalesDelPeriodo: 30 });
    expect(resultado.proyeccionAlCierre).toBe(900);
    expect(resultado.excedePresupuesto).toBe(true);
  });

  it('nunca calcula el forecast sumando open_commitment_amount — solo recibe actualAmount', () => {
    // El tipo de ForecastInput no expone un campo de commitment — esta prueba documenta la
    // garantía a nivel de firma, no de comportamiento en runtime.
    const resultado = calcularForecast({ amountBudgeted: 1000, actualAmount: 0, diasTranscurridosDelPeriodo: 5, diasTotalesDelPeriodo: 30 });
    expect(resultado.proyeccionAlCierre).toBe(0);
  });
});

describe('calcularUnitEconomics (UC-RPT-03)', () => {
  it('nunca presenta un margen completo si falta un componente — lo señala explícitamente', () => {
    const resultado = calcularUnitEconomics(
      { value: 1000, disponible: true },
      { value: null, disponible: false, razonNoDisponible: 'sin datos' },
      { value: null, disponible: false, razonNoDisponible: 'sin datos' },
    );
    expect(resultado.margen.disponible).toBe(false);
    expect(resultado.margen.value).toBeNull();
  });

  it('calcula el margen solo cuando las 3 fuentes están disponibles', () => {
    const resultado = calcularUnitEconomics({ value: 1000, disponible: true }, { value: 300, disponible: true }, { value: 200, disponible: true });
    expect(resultado.margen.disponible).toBe(true);
    expect(resultado.margen.value).toBe(500);
  });

  it('el margen es trazable a las 3 fuentes que lo componen', () => {
    const resultado = calcularUnitEconomics({ value: 1000, disponible: true }, { value: 300, disponible: true }, { value: 200, disponible: true });
    expect(resultado.revenue.value).toBe(1000);
    expect(resultado.costoDirecto.value).toBe(300);
    expect(resultado.costoHr.value).toBe(200);
  });
});

describe('generarResumenEjecutivo (UC-RPT-05)', () => {
  const dashboardVacio: DashboardParaResumen = {
    financiero: { tieneDatos: false, data: { totalBudgeted: 0, totalActual: 0 } },
    comercial: { tieneDatos: false, data: { totalProspectos: 0, convertidos: 0 } },
    deportivo: { tieneDatos: false, data: { totalMinutosJugados: 0, totalGoles: 0, totalCheckins: 0 } },
    hr: { tieneDatos: false, data: { totalCheckinsPersonal: 0 } },
  };

  it('nunca genera un bullet para una sección sin datos — ninguna afirmación sin fuente trazable', () => {
    expect(generarResumenEjecutivo(dashboardVacio)).toEqual([]);
  });

  it('toda frase generada trae su fuente citada explícitamente', () => {
    const dashboard: DashboardParaResumen = {
      ...dashboardVacio,
      financiero: { tieneDatos: true, data: { totalBudgeted: 1000, totalActual: 500 } },
    };
    const bullets = generarResumenEjecutivo(dashboard);
    expect(bullets).toHaveLength(1);
    expect(bullets[0].fuente).toBeTruthy();
    expect(bullets[0].texto).toContain('500');
  });

  it('genera un bullet por cada sección con datos, ninguno más', () => {
    const dashboard: DashboardParaResumen = {
      financiero: { tieneDatos: true, data: { totalBudgeted: 1000, totalActual: 500 } },
      comercial: { tieneDatos: true, data: { totalProspectos: 10, convertidos: 4 } },
      deportivo: { tieneDatos: false, data: { totalMinutosJugados: 0, totalGoles: 0, totalCheckins: 0 } },
      hr: { tieneDatos: false, data: { totalCheckinsPersonal: 0 } },
    };
    expect(generarResumenEjecutivo(dashboard)).toHaveLength(2);
  });
});
