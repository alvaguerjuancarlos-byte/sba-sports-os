import { describe, expect, it } from 'vitest';
import { esJerarquiaValida } from './configuration-studio.types.js';

// UC-CFG-01, flujo alterno 2a: ejemplo válido explícito "Revenue → Marketing Partnerships"
// (class → group) y ejemplo inválido explícito (concept como padre de class).
describe('esJerarquiaValida', () => {
  it('class puede ser padre de group (ejemplo ilustrativo del documento fuente)', () => {
    expect(esJerarquiaValida('class', 'group')).toBe(true);
  });

  it('concept no puede ser padre de class (ejemplo inválido explícito del documento fuente)', () => {
    expect(esJerarquiaValida('concept', 'class')).toBe(false);
  });

  it('class puede ser padre de cualquier tipo más específico', () => {
    expect(esJerarquiaValida('class', 'budget_line')).toBe(true);
    expect(esJerarquiaValida('class', 'concept')).toBe(true);
  });

  it('un tipo no puede ser padre de sí mismo', () => {
    expect(esJerarquiaValida('group', 'group')).toBe(false);
  });

  it('budget_line no puede ser padre de group (retrocede en la jerarquía)', () => {
    expect(esJerarquiaValida('budget_line', 'group')).toBe(false);
  });
});
