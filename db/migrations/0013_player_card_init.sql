-- Player Card — SBA Sports OS, Fase 5 (Athlete 360)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 5 v1.1 (UC-PLC-01 a 04, texto completo leído).
--
-- Decisiones de alcance:
-- - `athlete_medical_note` y `athlete_nutrition_note` — nuevas, cierran las brechas [ABIERTO] #1
--   y #2 del documento fuente (sección 5), con exactamente las columnas que ahí se proponen.
-- - `media_consent` — nueva, análoga a `biometric_consent` (Fase 3) pero para fotos/video, no
--   para reconocimiento facial (UC-PLC-03, literal: "distinto del consentimiento biométrico ya
--   modelado"). Mismo esquema, mismo servicio de patrón (otorgar/revocar).
-- - `gallery_asset` — nueva, cierra la brecha [ABIERTO] #3. Eliminar es archivar (`active = false`
--   + audit_log), nunca un DELETE físico — "eliminar un asset es una acción auditada, nunca un
--   borrado silencioso" (UC-PLC-03, literal).
-- - NO se construye `athlete_maturity_assessment` (brecha #5, sección 5) — es una adición
--   identificada por benchmarking competitivo, no por el RFP, y el propio documento la describe
--   como una brecha para "la próxima revisión de arquitectura", no algo que UC-PRF-01/02 exijan
--   en su flujo principal actual.
-- - Player Card NO es una tabla propia — es una vista ensamblada en la capa de aplicación
--   (PlayerCardQueryService) sobre entidades que ya existen en otros dominios más estas 4 tablas
--   nuevas. Ninguna migración de "player_card" existe porque no hay tabla que crear para eso.

create type athlete_medical_note_type as enum ('condition', 'allergy', 'restriction', 'injury');

create table athlete_medical_note (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  player_id         uuid not null references "user"(id),
  note_type         athlete_medical_note_type not null,
  description       text not null,
  recorded_by       uuid not null references "user"(id),
  recorded_at       timestamptz not null default now(),
  active            boolean not null default true
);
create index idx_athlete_medical_note_org on athlete_medical_note(organization_id);
create index idx_athlete_medical_note_player on athlete_medical_note(player_id);

create table athlete_nutrition_note (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  player_id         uuid not null references "user"(id),
  note              text not null,
  recorded_by       uuid not null references "user"(id),
  recorded_at       timestamptz not null default now()
);
create index idx_athlete_nutrition_note_org on athlete_nutrition_note(organization_id);
create index idx_athlete_nutrition_note_player on athlete_nutrition_note(player_id);

create type media_consent_status as enum ('requested', 'granted', 'revoked');

create table media_consent (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id),
  user_id         uuid not null references "user"(id),
  consent_status  media_consent_status not null,
  granted_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index idx_media_consent_org on media_consent(organization_id);

create type gallery_asset_scope as enum ('athlete', 'team');
create type gallery_asset_type as enum ('photo', 'video');

create table gallery_asset (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organization(id),
  scope             gallery_asset_scope not null,
  scope_ref_id      uuid not null,
  asset_url         text not null,
  asset_type        gallery_asset_type not null,
  uploaded_by       uuid not null references "user"(id),
  uploaded_at       timestamptz not null default now(),
  active            boolean not null default true
);
create index idx_gallery_asset_org on gallery_asset(organization_id);
create index idx_gallery_asset_scope_ref on gallery_asset(scope, scope_ref_id);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
alter table athlete_medical_note enable row level security;
alter table athlete_medical_note force row level security;
create policy tenant_isolation on athlete_medical_note
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table athlete_nutrition_note enable row level security;
alter table athlete_nutrition_note force row level security;
create policy tenant_isolation on athlete_nutrition_note
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table media_consent enable row level security;
alter table media_consent force row level security;
create policy tenant_isolation on media_consent
  using (organization_id = current_setting('app.tenant_id', true)::uuid);

alter table gallery_asset enable row level security;
alter table gallery_asset force row level security;
create policy tenant_isolation on gallery_asset
  using (organization_id = current_setting('app.tenant_id', true)::uuid);
