import { describe, expect, it } from 'vitest';
import { generarCsv, parsearCsv } from './csv.util.js';

describe('parsearCsv', () => {
  it('parsea filas simples separadas por coma', () => {
    const filas = parsearCsv('type,name,parent_id\nclass,Revenue,\ngroup,Marketing,abc-123\n');
    expect(filas).toEqual([
      { type: 'class', name: 'Revenue', parent_id: '' },
      { type: 'group', name: 'Marketing', parent_id: 'abc-123' },
    ]);
  });

  it('respeta campos entre comillas que contienen comas', () => {
    const filas = parsearCsv('name,price\n"Uniforme, talla M",250\n');
    expect(filas).toEqual([{ name: 'Uniforme, talla M', price: '250' }]);
  });

  it('desescapa comillas dobles dentro de un campo entre comillas', () => {
    const filas = parsearCsv('name\n"El ""mejor"" producto"\n');
    expect(filas).toEqual([{ name: 'El "mejor" producto' }]);
  });

  it('ignora una línea final vacía', () => {
    const filas = parsearCsv('name\nUniforme\n\n');
    expect(filas).toHaveLength(1);
  });

  it('regresa vacío para texto vacío', () => {
    expect(parsearCsv('')).toEqual([]);
  });
});

describe('generarCsv', () => {
  it('genera encabezado y filas en el orden dado', () => {
    const csv = generarCsv(['id', 'name'], [{ id: '1', name: 'Uniforme' }]);
    expect(csv).toBe('id,name\n1,Uniforme');
  });

  it('escapa valores que contienen comas o comillas', () => {
    const csv = generarCsv(['name'], [{ name: 'Uniforme, talla "M"' }]);
    expect(csv).toBe('name\n"Uniforme, talla ""M"""');
  });

  it('regresa cadena vacía para valores null/undefined', () => {
    const csv = generarCsv(['parent_id'], [{ parent_id: null }]);
    expect(csv).toBe('parent_id\n');
  });
});
