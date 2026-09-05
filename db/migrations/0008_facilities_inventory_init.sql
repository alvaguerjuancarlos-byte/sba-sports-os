-- Facilities & Inventory — SBA Sports OS, Fase 3 (Sports Core)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 3 v1.0 (UC-FAC-01 a UC-FAC-03, texto completo
-- leído). Sin diccionario-datos-fase3.md — modelo interpretado directo del texto.
--
-- Decisión de alcance: `inventory_checkout` NO referencia `event` — el texto de UC-FAC-02
-- menciona "fin del evento + margen configurable" como la razón conceptual de una alerta de
-- no-devolución, pero las entidades listadas para ese caso de uso son solo inventory_checkout e
-- inventory_item, sin event. En vez de inventar un vínculo a event para computar una ventana de
-- tiempo, se implementa el criterio de aceptación literal que SÍ está probado: "todo
-- inventory_checkout sin returned_at es visible en un reporte de material pendiente de
-- devolución" — un reporte de solo lectura, sin alerta programada (mismo tipo de integración
-- diferida que los recordatorios de cobranza de Payments & Billing, UC-PAY-06).
--
-- `inventory_item.venue_id` referencia `venue` (Calendar & RSVP, migración 0006) solo a nivel de
-- FK — este dominio nunca importa CalendarRsvpModule ni llama a VenueService: confía en la
-- violación de FK para "el venue no existe", mismo patrón que budget_line → financial_dimension
-- en Admin Hub.

create type inventory_item_status as enum ('active', 'archived');

create table inventory_item (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  venue_id        uuid not null references venue(id),
  name            text not null,
  category        text not null,
  quantity_total  integer not null,
  status          inventory_item_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint inventory_item_cantidad_valida check (quantity_total > 0)
);
create index idx_inventory_item_org on inventory_item(organization_id);
create index idx_inventory_item_venue on inventory_item(venue_id);

-- UC-FAC-02. "El check-out requiere un actor autorizado identificado" — checked_out_by nunca
-- nullable. returned_at null = check-out abierto; "nunca se pierde de vista silenciosamente"
-- (criterio de aceptación) se resuelve con una consulta directa de returned_at is null, no con un
-- campo de estado adicional.
create table inventory_checkout (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  inventory_item_id uuid not null references inventory_item(id),
  checked_out_by    uuid not null references "user"(id),
  quantity          integer not null,
  checked_out_at    timestamptz not null default now(),
  returned_at       timestamptz,
  created_at        timestamptz not null default now(),
  constraint inventory_checkout_cantidad_valida check (quantity > 0)
);
create index idx_inventory_checkout_org on inventory_checkout(organization_id);
create index idx_inventory_checkout_item on inventory_checkout(inventory_item_id);
-- "La disponibilidad mostrada siempre resta los check-outs abiertos" — la consulta de
-- disponibilidad y el reporte de pendientes siempre filtran por returned_at is null.
create index idx_inventory_checkout_abiertos on inventory_checkout(inventory_item_id) where returned_at is null;

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table inventory_item enable row level security;
alter table inventory_item force row level security;
create policy tenant_isolation on inventory_item
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table inventory_checkout enable row level security;
alter table inventory_checkout force row level security;
create policy tenant_isolation on inventory_checkout
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
