import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { calcularUnitEconomics } from './reporting-ai.types.js';
import type { ComponenteUnitEconomics, UnitEconomicsResultado } from './reporting-ai.types.js';

export type UnidadDeAnalisis = 'athlete' | 'sport' | 'venue' | 'coach_hour';

export interface ConsultarUnitEconomicsInput {
  organizationId: string;
  unit: UnidadDeAnalisis;
  unitRef: string; // athleteUserId | sport | venueId | employeeId, según `unit`
  desde: string;
  hasta: string;
}

const SIN_FUENTE = (mensaje: string): ComponenteUnitEconomics => ({ value: null, disponible: false, razonNoDisponible: mensaje });

// UC-RPT-03 — Generar reporte de unit economics.
//
// GAP REAL DE MODELO DE DATOS (no inventado para esta pieza, heredado de Fase 2/6): `budget_line`
// solo liga a `financial_dimension` (Admin Hub, arquitectura) — nunca a venue/sport/atleta — así
// que "costo directo" NUNCA es atribuible a ninguna unidad de análisis con el modelo actual.
// `payroll_input` (UC-HR-03) captura horas/bonos pero NUNCA una tarifa monetaria por hora
// (criterio de aceptación literal: "el sistema nunca calcula un monto de nómina") — así que
// "costo de HR" tampoco es monetariamente atribuible. Esto no es un atajo de esta pieza: es
// exactamente el escenario que UC-RPT-03 anticipa en su propio flujo 2a ("el sistema calcula el
// margen parcial disponible y señala explícitamente qué componente de costo falta") — se
// documenta aquí como recomendación para la siguiente revisión de arquitectura, la misma
// disciplina de la sección 5 del documento de Fase 5.
@Injectable()
export class UnitEconomicsService {
  constructor(private readonly db: DatabaseService) {}

  async consultar(input: ConsultarUnitEconomicsInput): Promise<UnitEconomicsResultado> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const costoDirecto = SIN_FUENTE('budget_line solo liga a financial_dimension, nunca a venue/sport/atleta — no hay costo directo atribuible a esta unidad con el modelo de datos actual.');
      const costoHr = SIN_FUENTE('payroll_input nunca calcula un monto monetario (UC-HR-03, literal) — no hay costo de HR expresable en dinero.');

      let revenue: ComponenteUnitEconomics;
      switch (input.unit) {
        case 'athlete': {
          const { rows } = await client.query<{ total: string }>(
            `select coalesce(sum(amount_collected), 0) as total from fact_payment where athlete_user_id = $1 and due_date between $2 and $3`,
            [input.unitRef, input.desde, input.hasta],
          );
          revenue = { value: Number(rows[0].total), disponible: true };
          break;
        }
        case 'sport': {
          const { rows } = await client.query<{ total: string }>(
            `select coalesce(sum(fp.amount_collected), 0) as total
             from fact_payment fp
             where fp.due_date between $2 and $3
               and fp.athlete_user_id in (
                 select rm.user_id from roster_membership rm join team t on t.id = rm.team_id where t.sport = $1
               )`,
            [input.unitRef, input.desde, input.hasta],
          );
          revenue = { value: Number(rows[0].total), disponible: true };
          break;
        }
        case 'venue':
          revenue = SIN_FUENTE('invoice/transaction no se ligan a venue — no hay ingreso atribuible a una sede específica con el modelo de datos actual.');
          break;
        case 'coach_hour':
          revenue = SIN_FUENTE('un coach-hora no genera un ingreso directamente atribuible en el modelo de datos actual (el ingreso se liga al atleta, no a la sesión de coaching).');
          break;
        default:
          throw new BadRequestException(`Unidad de análisis no reconocida: ${input.unit}`);
      }

      return calcularUnitEconomics(revenue, costoDirecto, costoHr);
    });
  }
}
