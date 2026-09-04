import { describe, expect, it } from 'vitest';
import { calcularRuteo, puedeAprobar } from './admin-hub.types.js';

// UC-ADM-02, pasos 3-4.
describe('calcularRuteo', () => {
  it('clasifica como within_budget cuando el monto cabe en el saldo disponible', () => {
    expect(calcularRuteo(500, 1000)).toBe('within_budget');
  });

  it('clasifica como within_budget cuando el monto es exactamente el saldo disponible', () => {
    expect(calcularRuteo(1000, 1000)).toBe('within_budget');
  });

  it('clasifica como exception cuando el monto excede el saldo disponible', () => {
    expect(calcularRuteo(1500, 1000)).toBe('exception');
  });

  it('clasifica como exception cuando el saldo disponible ya es negativo', () => {
    expect(calcularRuteo(100, -50)).toBe('exception');
  });
});

// UC-ADM-03, flujo 3 + alt 4a.
describe('puedeAprobar', () => {
  it('within_budget puede aprobarlo un admin', () => {
    expect(puedeAprobar('within_budget', ['admin'])).toBe(true);
  });

  it('within_budget puede aprobarlo un director', () => {
    expect(puedeAprobar('within_budget', ['director'])).toBe(true);
  });

  it('exception NO puede aprobarla un admin de primer nivel (alt-flow 4a)', () => {
    expect(puedeAprobar('exception', ['admin'])).toBe(false);
  });

  it('exception sí puede aprobarla un director (nivel escalado)', () => {
    expect(puedeAprobar('exception', ['director'])).toBe(true);
  });

  it('un coach nunca puede aprobar, sea cual sea el ruteo', () => {
    expect(puedeAprobar('within_budget', ['coach'])).toBe(false);
    expect(puedeAprobar('exception', ['coach'])).toBe(false);
  });
});
