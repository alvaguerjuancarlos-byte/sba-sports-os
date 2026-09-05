import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../db/database.service.js';
import { AuditLogService } from '../shared/audit-log/audit-log.service.js';
import type { BudgetLineRow } from './admin-hub.types.js';

export interface CrearBudgetLineInput {
  organizationId: string;
  actorUserId: string;
  financialDimensionId: string;
  season: string;
  period: string;
  amountBudgeted: string | number;
}

export interface ArchivarBudgetLineInput {
  organizationId: string;
  actorUserId: string;
  budgetLineId: string;
}

// UC-ADM-01 — Crear budget line por temporada.
@Injectable()
export class BudgetLineService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLog: AuditLogService,
  ) {}

  async crear(input: CrearBudgetLineInput): Promise<BudgetLineRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      let budgetLine: BudgetLineRow;
      try {
        const { rows } = await client.query<BudgetLineRow>(
          `insert into budget_line (organization_id, financial_dimension_id, season, period, amount_budgeted, status)
           values ($1, $2, $3, $4, $5, 'active')
           returning *`,
          [input.organizationId, input.financialDimensionId, input.season, input.period, input.amountBudgeted],
        );
        budgetLine = rows[0];
      } catch (e) {
        // "Requiere que la dimensión ya exista" — se apoya en la FK de financial_dimension_id en
        // vez de duplicar una consulta a la tabla de otro dominio (Configuration Studio).
        if (this.esViolacionDeFk(e)) {
          throw new NotFoundException('La dimensión financiera indicada no existe (UC-ADM-01 requiere que ya exista).');
        }
        if (this.esViolacionDeUnicidad(e)) {
          throw new ConflictException('Ya existe un budget_line para esa dimensión, temporada y periodo.');
        }
        throw e;
      }

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'budget_line',
        entityId: budgetLine.id,
        newValue: {
          financialDimensionId: budgetLine.financial_dimension_id,
          season: budgetLine.season,
          period: budgetLine.period,
          amountBudgeted: budgetLine.amount_budgeted,
        },
      });

      return budgetLine;
    });
  }

  async archivar(input: ArchivarBudgetLineInput): Promise<BudgetLineRow> {
    return this.db.withTenant(input.organizationId, async (client) => {
      const { rows } = await client.query<BudgetLineRow>(`select * from budget_line where id = $1`, [input.budgetLineId]);
      const anterior = rows[0];
      if (!anterior) throw new NotFoundException('budget_line no encontrado.');

      const { rows: updated } = await client.query<BudgetLineRow>(
        `update budget_line set status = 'archived' where id = $1 returning *`,
        [input.budgetLineId],
      );

      await this.auditLog.record(client, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        entityType: 'budget_line',
        entityId: anterior.id,
        fieldChanged: 'status',
        oldValue: { status: anterior.status },
        newValue: { status: 'archived' },
      });

      return updated[0];
    });
  }

  // Lectura para el frontend — sin esto no hay forma de mostrar/elegir un budget_line existente
  // (ej. al capturar una purchase_request, UC-ADM-02).
  async listar(organizationId: string, opciones: { status?: 'active' | 'archived' } = {}): Promise<BudgetLineRow[]> {
    return this.db.withTenant(organizationId, async (client) => {
      if (opciones.status) {
        const { rows } = await client.query<BudgetLineRow>(`select * from budget_line where status = $1 order by season, period`, [opciones.status]);
        return rows;
      }
      const { rows } = await client.query<BudgetLineRow>(`select * from budget_line order by season, period`);
      return rows;
    });
  }

  private esViolacionDeFk(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23503';
  }

  private esViolacionDeUnicidad(e: unknown): boolean {
    return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
  }
}
