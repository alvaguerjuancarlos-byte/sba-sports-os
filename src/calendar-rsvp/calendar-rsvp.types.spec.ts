import { describe, expect, it } from 'vitest';
import { tienePermisoDeExcepcion } from './calendar-rsvp.types.js';

// UC-CAL-02, flujo 3 + alt 3a.
describe('tienePermisoDeExcepcion', () => {
  it('admin tiene permiso de excepción', () => {
    expect(tienePermisoDeExcepcion(['admin'])).toBe(true);
  });

  it('director tiene permiso de excepción', () => {
    expect(tienePermisoDeExcepcion(['director'])).toBe(true);
  });

  it('coach NO tiene permiso de excepción — no se le muestra la opción de forzar traslape', () => {
    expect(tienePermisoDeExcepcion(['coach'])).toBe(false);
  });

  it('un rol sin ningún permiso elevado no tiene permiso de excepción', () => {
    expect(tienePermisoDeExcepcion(['player'])).toBe(false);
  });
});
