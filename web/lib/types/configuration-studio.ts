// Espejo de src/configuration-studio/configuration-studio.types.ts (backend).
export type DimensionType = 'class' | 'group' | 'budget_line' | 'concept';
export type CfgStatus = 'active' | 'archived';

export interface FinancialDimension {
  id: string;
  organization_id: string;
  type: DimensionType;
  name: string;
  parent_id: string | null;
  status: CfgStatus;
  is_qualifying_for_block: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCatalogItem {
  id: string;
  organization_id: string;
  product_key: string;
  name: string;
  attributes: Record<string, unknown> | null;
  price: string;
  financial_dimension_id: string | null;
  effective_date: string;
  effective_until: string | null;
  status: CfgStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  organization_id: string;
  actor_user_id: string;
  entity_type: string;
  entity_id: string;
  field_changed: string | null;
  old_value: unknown;
  new_value: unknown;
  occurred_at: string;
}
