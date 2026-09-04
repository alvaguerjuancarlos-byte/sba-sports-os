// Tipos de fila — reflejan db/migrations/0002_configuration_studio_init.sql.

export type DimensionType = 'class' | 'group' | 'budget_line' | 'concept';
export type CfgStatus = 'active' | 'archived';

export interface FinancialDimensionRow {
  id: string;
  organization_id: string;
  type: DimensionType;
  name: string;
  parent_id: string | null;
  status: CfgStatus;
  created_at: string;
  updated_at: string;
}

export interface ProductCatalogRow {
  id: string;
  organization_id: string;
  product_key: string;
  name: string;
  attributes: Record<string, unknown> | null;
  price: string; // numeric de Postgres llega como string
  financial_dimension_id: string | null;
  effective_date: string;
  effective_until: string | null;
  status: CfgStatus;
  created_at: string;
  updated_at: string;
}

// UC-CFG-01, flujo alterno 2a: "parent_id referencia una dimensión de tipo distinto de forma
// inconsistente (ej. un concept como padre de un class) → el sistema rechaza la jerarquía
// inválida." El orden exacto de anidamiento no viene enumerado literal, pero sí se desprende del
// ejemplo ilustrativo ("Revenue → Marketing Partnerships" = class → group) y del ejemplo inválido
// explícito (concept no puede ser padre de class) — [propuesto]: un padre debe ser un tipo
// estrictamente "más amplio" (índice menor en este orden) que su hijo.
const ORDEN_JERARQUIA: DimensionType[] = ['class', 'group', 'budget_line', 'concept'];

export function esJerarquiaValida(parentType: DimensionType, childType: DimensionType): boolean {
  return ORDEN_JERARQUIA.indexOf(parentType) < ORDEN_JERARQUIA.indexOf(childType);
}
