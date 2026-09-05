import { describe, expect, it } from 'vitest';
import { rangosSeSolapan } from './sports-hub.types.js';

// UC-SPT-01 — detección de solapamiento de fechas entre temporadas.
describe('rangosSeSolapan', () => {
  it('rangos idénticos se solapan', () => {
    expect(rangosSeSolapan('2026-01-01', '2026-06-30', '2026-01-01', '2026-06-30')).toBe(true);
  });

  it('rangos que no se tocan no se solapan', () => {
    expect(rangosSeSolapan('2026-01-01', '2026-06-30', '2026-07-01', '2026-12-31')).toBe(false);
  });

  it('rangos parcialmente encimados se solapan', () => {
    expect(rangosSeSolapan('2026-01-01', '2026-06-30', '2026-06-01', '2026-12-31')).toBe(true);
  });

  it('un rango contenido dentro de otro se solapa', () => {
    expect(rangosSeSolapan('2026-01-01', '2026-12-31', '2026-03-01', '2026-04-01')).toBe(true);
  });

  it('rangos consecutivos (fin de uno = inicio del otro) se consideran solapados (inclusivo)', () => {
    expect(rangosSeSolapan('2026-01-01', '2026-06-30', '2026-06-30', '2026-12-31')).toBe(true);
  });
});
