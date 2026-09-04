import { describe, expect, it } from 'vitest';
import {
  calcularEstadoEfectivo,
  calcularMontoConBeca,
  redactarBecaSiNoTieneScope,
  tieneScopeDeBeca,
  type MembershipPlanRow,
} from './payments-billing.types.js';

// UC-PAY-02, criterio de aceptación: status derivado, nunca editado manualmente.
describe('calcularEstadoEfectivo', () => {
  it('una factura paid siempre es paid, sin importar la fecha', () => {
    expect(calcularEstadoEfectivo('paid', '2020-01-01', new Date('2026-01-01'))).toBe('paid');
  });

  it('una factura pending con due_date futura es pending', () => {
    expect(calcularEstadoEfectivo('pending', '2026-12-31', new Date('2026-01-01'))).toBe('pending');
  });

  it('una factura pending con due_date pasada es overdue', () => {
    expect(calcularEstadoEfectivo('pending', '2026-01-01', new Date('2026-06-01'))).toBe('overdue');
  });

  it('una factura pending que vence hoy todavía no es overdue', () => {
    expect(calcularEstadoEfectivo('pending', '2026-06-01', new Date('2026-06-01'))).toBe('pending');
  });
});

// UC-PAY-04, flujo 3.
describe('calcularMontoConBeca', () => {
  const sinBeca = { scholarship_flag: false, scholarship_amount: null, scholarship_pct: null };

  it('sin beca activa regresa el monto base sin cambios', () => {
    expect(calcularMontoConBeca(1000, sinBeca)).toBe(1000);
  });

  it('con beca de monto fijo resta ese monto', () => {
    expect(calcularMontoConBeca(1000, { scholarship_flag: true, scholarship_amount: '300', scholarship_pct: null })).toBe(700);
  });

  it('con beca de porcentaje aplica el descuento proporcional', () => {
    expect(calcularMontoConBeca(1000, { scholarship_flag: true, scholarship_amount: null, scholarship_pct: '25' })).toBe(750);
  });

  it('prioriza el monto fijo sobre el porcentaje si ambos existen', () => {
    expect(calcularMontoConBeca(1000, { scholarship_flag: true, scholarship_amount: '300', scholarship_pct: '50' })).toBe(700);
  });

  it('nunca resulta en un monto negativo', () => {
    expect(calcularMontoConBeca(100, { scholarship_flag: true, scholarship_amount: '500', scholarship_pct: null })).toBe(0);
  });
});

describe('tieneScopeDeBeca', () => {
  it('director tiene el scope', () => {
    expect(tieneScopeDeBeca(['director'])).toBe(true);
  });

  it('admin general no tiene el scope', () => {
    expect(tieneScopeDeBeca(['admin'])).toBe(false);
  });
});

// UC-PAY-04, criterio de aceptación: "un usuario sin el scope de beca nunca ve el detalle de la
// beca en ninguna pantalla."
describe('redactarBecaSiNoTieneScope', () => {
  const plan: MembershipPlanRow = {
    id: 'plan-1',
    organization_id: 'org-1',
    athlete_user_id: 'user-1',
    product_catalog_id: 'prod-1',
    name: 'Mensualidad',
    amount: '1000.00',
    currency: 'MXN',
    billing_cycle: 'monthly',
    scholarship_flag: true,
    scholarship_amount: '300.00',
    scholarship_pct: null,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('un director ve el detalle completo de la beca', () => {
    const resultado = redactarBecaSiNoTieneScope(plan, ['director']);
    expect(resultado.scholarship_flag).toBe(true);
    expect(resultado.scholarship_amount).toBe('300.00');
  });

  it('un admin sin scope nunca ve el detalle de la beca', () => {
    const resultado = redactarBecaSiNoTieneScope(plan, ['admin']);
    expect(resultado.scholarship_flag).toBeUndefined();
    expect(resultado.scholarship_amount).toBeUndefined();
    expect(resultado.scholarship_pct).toBeUndefined();
  });

  it('el resto de los campos del plan siguen visibles para un admin sin scope', () => {
    const resultado = redactarBecaSiNoTieneScope(plan, ['admin']);
    expect(resultado.name).toBe('Mensualidad');
    expect(resultado.amount).toBe('1000.00');
  });
});
