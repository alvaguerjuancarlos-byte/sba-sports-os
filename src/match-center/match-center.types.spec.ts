import { describe, expect, it } from 'vitest';
import { calcularMinutosJugados } from './match-center.types.js';

// UC-MAT-03, paso 3.
describe('calcularMinutosJugados', () => {
  it('un titular que juega todo el partido, minutos = finalMinute', () => {
    const minutos = calcularMinutosJugados({
      lineup: { id: 'l1', user_id: 'u1', is_starter: true },
      minutoDeEntrada: null,
      minutoDeSalida: null,
      finalMinute: 90,
    });
    expect(minutos).toBe(90);
  });

  it('un titular sustituido al minuto 60, minutos = 60', () => {
    const minutos = calcularMinutosJugados({
      lineup: { id: 'l1', user_id: 'u1', is_starter: true },
      minutoDeEntrada: null,
      minutoDeSalida: 60,
      finalMinute: 90,
    });
    expect(minutos).toBe(60);
  });

  it('un suplente que entra al minuto 70 y termina el partido, minutos = 20', () => {
    const minutos = calcularMinutosJugados({
      lineup: { id: 'l1', user_id: 'u1', is_starter: false },
      minutoDeEntrada: 70,
      minutoDeSalida: null,
      finalMinute: 90,
    });
    expect(minutos).toBe(20);
  });

  it('un suplente que entra al minuto 70 y sale al 85, minutos = 15', () => {
    const minutos = calcularMinutosJugados({
      lineup: { id: 'l1', user_id: 'u1', is_starter: false },
      minutoDeEntrada: 70,
      minutoDeSalida: 85,
      finalMinute: 90,
    });
    expect(minutos).toBe(15);
  });

  it('un partido con cero eventos, el titular igual acumula finalMinute completo', () => {
    const minutos = calcularMinutosJugados({
      lineup: { id: 'l1', user_id: 'u1', is_starter: true },
      minutoDeEntrada: null,
      minutoDeSalida: null,
      finalMinute: 40,
    });
    expect(minutos).toBe(40);
  });

  it('nunca regresa un valor negativo', () => {
    const minutos = calcularMinutosJugados({
      lineup: { id: 'l1', user_id: 'u1', is_starter: false },
      minutoDeEntrada: 80,
      minutoDeSalida: 75, // dato inconsistente, no debería pasar en la práctica
      finalMinute: 90,
    });
    expect(minutos).toBe(0);
  });
});
