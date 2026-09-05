import { describe, expect, it } from 'vitest';
import {
  ordenarAlternosPorPrioridad,
  redactarComentarioSiNoTieneScope,
  tieneScopeDeWaiver,
  type CallupWaiverRow,
} from './callup-engine.types.js';

// UC-CUP-03 — criterios de aceptación: reproducible, desempate por antigüedad, nunca aleatorio.
describe('ordenarAlternosPorPrioridad', () => {
  it('ordena por priority_score descendente', () => {
    const orden = ordenarAlternosPorPrioridad([
      { userId: 'a', priorityScore: 2, rosterCreatedAt: '2026-01-01' },
      { userId: 'b', priorityScore: 5, rosterCreatedAt: '2026-01-01' },
    ]);
    expect(orden.map((c) => c.userId)).toEqual(['b', 'a']);
  });

  it('en caso de empate, desempata por antigüedad en el equipo (el más antiguo gana)', () => {
    const orden = ordenarAlternosPorPrioridad([
      { userId: 'reciente', priorityScore: 3, rosterCreatedAt: '2026-06-01' },
      { userId: 'antiguo', priorityScore: 3, rosterCreatedAt: '2025-01-01' },
    ]);
    expect(orden.map((c) => c.userId)).toEqual(['antiguo', 'reciente']);
  });

  it('es reproducible: el mismo conjunto de datos siempre da el mismo orden', () => {
    const candidatos = [
      { userId: 'a', priorityScore: 3, rosterCreatedAt: '2026-01-01' },
      { userId: 'b', priorityScore: 3, rosterCreatedAt: '2025-01-01' },
      { userId: 'c', priorityScore: 7, rosterCreatedAt: '2026-03-01' },
    ];
    const orden1 = ordenarAlternosPorPrioridad(candidatos).map((c) => c.userId);
    const orden2 = ordenarAlternosPorPrioridad(candidatos).map((c) => c.userId);
    expect(orden1).toEqual(orden2);
    expect(orden1).toEqual(['c', 'b', 'a']);
  });
});

// UC-CUP-04 — el internal_comment nunca es visible fuera de roles admin.
describe('tieneScopeDeWaiver / redactarComentarioSiNoTieneScope', () => {
  const waiver: CallupWaiverRow = {
    id: 'waiver-1',
    organization_id: 'org-1',
    callup_slot_id: 'slot-1',
    waived_by: 'coach-1',
    action: 'exclude',
    internal_comment: 'Llegó tarde a los últimos 3 entrenamientos.',
    created_at: '2026-01-01T00:00:00Z',
  };

  it('director tiene el scope y ve el comentario', () => {
    expect(tieneScopeDeWaiver(['director'])).toBe(true);
    expect(redactarComentarioSiNoTieneScope(waiver, ['director']).internal_comment).toBe(waiver.internal_comment);
  });

  it('un admin de primer nivel no ve el comentario', () => {
    expect(tieneScopeDeWaiver(['admin'])).toBe(false);
    expect(redactarComentarioSiNoTieneScope(waiver, ['admin']).internal_comment).toBeUndefined();
  });

  it('ni siquiera el coach que escribió el comentario lo ve de vuelta sin el scope', () => {
    expect(redactarComentarioSiNoTieneScope(waiver, ['coach']).internal_comment).toBeUndefined();
  });

  it('la familia/jugador nunca ve el comentario', () => {
    expect(redactarComentarioSiNoTieneScope(waiver, ['parent']).internal_comment).toBeUndefined();
    expect(redactarComentarioSiNoTieneScope(waiver, ['player']).internal_comment).toBeUndefined();
  });
});
