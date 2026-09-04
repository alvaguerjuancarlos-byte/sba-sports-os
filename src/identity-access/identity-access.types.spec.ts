import { describe, expect, it } from 'vitest';
import { calcularEsMenorDeEdad } from './identity-access.types.js';

// UC-ID-01 paso 2: "el sistema calcula si la persona es menor de edad a partir de la fecha de
// nacimiento" — casos límite de cumpleaños, no solo resta de años.
describe('calcularEsMenorDeEdad', () => {
  it('es menor un día antes de cumplir 18', () => {
    const nacimiento = new Date(2008, 8, 4); // 4-sep-2008
    const ahora = new Date(2026, 8, 3); // 3-sep-2026 — un día antes del cumpleaños 18
    expect(calcularEsMenorDeEdad(nacimiento, ahora)).toBe(true);
  });

  it('ya no es menor el mismo día del cumpleaños 18', () => {
    const nacimiento = new Date(2008, 8, 4);
    const ahora = new Date(2026, 8, 4); // cumple 18 exactamente hoy
    expect(calcularEsMenorDeEdad(nacimiento, ahora)).toBe(false);
  });

  it('ya no es menor el día después del cumpleaños 18', () => {
    const nacimiento = new Date(2008, 8, 4);
    const ahora = new Date(2026, 8, 5);
    expect(calcularEsMenorDeEdad(nacimiento, ahora)).toBe(false);
  });

  it('es menor claramente (niño de 10 años)', () => {
    const nacimiento = new Date(2016, 0, 15);
    const ahora = new Date(2026, 8, 4);
    expect(calcularEsMenorDeEdad(nacimiento, ahora)).toBe(true);
  });

  it('no es menor claramente (adulto de 40 años)', () => {
    const nacimiento = new Date(1986, 0, 15);
    const ahora = new Date(2026, 8, 4);
    expect(calcularEsMenorDeEdad(nacimiento, ahora)).toBe(false);
  });
});
