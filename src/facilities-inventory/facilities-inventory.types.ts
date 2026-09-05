// Tipos de fila — reflejan db/migrations/0008_facilities_inventory_init.sql.

export type InventoryItemStatus = 'active' | 'archived';

export interface InventoryItemRow {
  id: string;
  organization_id: string;
  venue_id: string;
  name: string;
  category: string;
  quantity_total: number;
  status: InventoryItemStatus;
  created_at: string;
  updated_at: string;
}

export interface InventoryCheckoutRow {
  id: string;
  organization_id: string;
  inventory_item_id: string;
  checked_out_by: string;
  quantity: number;
  checked_out_at: string;
  returned_at: string | null;
  created_at: string;
}

export interface DisponibilidadItem extends InventoryItemRow {
  disponible: number;
}
