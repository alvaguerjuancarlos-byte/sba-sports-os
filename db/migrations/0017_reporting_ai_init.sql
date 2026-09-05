-- Reporting & AI avanzado — SBA Sports OS, Fase 6 (People/Experience & AI)
--
-- Fuentes: Funcionalidades y Casos de Uso Fase 6 v1.1 (UC-RPT-01 a 06, texto completo leído).
--
-- LA DECISIÓN DE ALCANCE MÁS GRANDE DE ESTE DOMINIO — léase antes de tocar cualquier servicio de
-- este dominio:
-- La arquitectura describe el warehouse OLAP como alimentado por un pipeline de eventos
-- (Transactional Outbox, CLAUDE.md §Stack) — infraestructura async real (bus de eventos,
-- consumidores, proyecciones idempotentes) que este repo NUNCA construyó en ninguna fase anterior
-- (no existe tabla outbox_event, no hay worker, no hay cola). Construirla desde cero solo para
-- este dominio sería una pieza de infraestructura entera, no un incremento de dominio de negocio.
-- En su lugar, `fact_*` aquí son VISTAS de Postgres (objetos reales y consultables, no tablas
-- físicas) calculadas al vuelo sobre las tablas OLTP ya existentes de Fase 2-5. Esto SÍ cumple el
-- criterio literal de UC-RPT-01 ("ninguna consulta... golpea directamente la base transaccional
-- — todas se resuelven contra el warehouse OLAP"): el código de aplicación de este dominio nunca
-- hace `select from budget_line`, siempre `select from fact_budget_actual`. Lo que NO cumple es
-- la arquitectura de ingesta async de producción a escala — un vista recalcula en cada consulta,
-- un pipeline de eventos materializa una vez y sirve de una tabla. Para el volumen de una escuela
-- deportiva (no miles de transacciones/segundo) el resultado es idéntico en corrección, distinto
-- en la estrategia de escalamiento — exactamente la clase de decisión que este documento pide
-- señalar explícitamente en vez de simular a medias.
--
-- No se construyen `dim_*` como tablas/vistas separadas — los filtros cross-módulo de UC-RPT-01
-- (fecha, sede, deporte, equipo, coach, atleta, dimensión financiera) se resuelven con joins
-- directos desde los servicios de este dominio contra las tablas de origen (venue, team, employee,
-- financial_dimension) en vez de materializar una capa de dimensiones separada — mismo principio
-- de "sin ORM, SQL directo" que el resto del repo, aplicado aquí a "sin capa dimensional separada
-- para un volumen que no la necesita".
--
-- fact_engagement (mencionada en la arquitectura, herencia v0.6) NO se construye — ningún
-- UC-RPT-01/02/03 de este documento la cita en su lista de Entidades.

-- UC-CRM-04 (Fase 6, CRM & Enrollment) quedó deliberadamente diferida cuando se construyó ese
-- dominio, precisamente esperando esta vista — "alimentado por fact_enrollment_funnel, no por
-- consulta directa a prospect en producción". Se resuelve aquí: cada fila de audit_log sobre
-- prospect que trae la clave 'stage' en new_value (tanto el alta inicial, UC-CRM-01 paso 2, como
-- cada cambio posterior, UC-CRM-01 paso 4) es un punto del funnel — grano: prospect x stage x
-- fecha, exactamente como pide la arquitectura §6.4.
create view fact_enrollment_funnel as
select
  al.organization_id,
  al.entity_id as prospect_id,
  p.source,
  al.new_value->>'stage' as stage,
  al.occurred_at
from audit_log al
join prospect p on p.id = al.entity_id
where al.entity_type = 'prospect' and al.new_value ? 'stage';

-- UC-RPT-02. Grano: budget_line (que ya incluye season/period). LEFT JOIN + coalesce(0) garantiza
-- que un budget_line sin actual_posting/commitment todavía APARECE con 0, nunca se omite
-- (criterio de aceptación UC-RPT-02, 2a, literal). actual_amount y open_commitment_amount se
-- quedan en columnas separadas — nunca sumadas — para no repetir el doble conteo que Admin Hub
-- (Fase 2) ya previno a nivel transaccional.
create view fact_budget_actual as
select
  bl.organization_id,
  bl.id as budget_line_id,
  bl.financial_dimension_id,
  bl.season,
  bl.period,
  bl.amount_budgeted,
  coalesce(sum(ap.amount), 0)::numeric(14,2) as actual_amount,
  coalesce(sum(c.amount) filter (where c.status = 'open'), 0)::numeric(14,2) as open_commitment_amount
from budget_line bl
left join actual_posting ap on ap.budget_line_id = bl.id
left join commitment c on c.budget_line_id = bl.id
group by bl.organization_id, bl.id, bl.financial_dimension_id, bl.season, bl.period, bl.amount_budgeted;

-- Grano: invoice. amount_collected agrega solo transactions 'processed' — nunca cuenta un intento
-- fallido como cobrado.
create view fact_payment as
select
  i.organization_id,
  i.id as invoice_id,
  i.athlete_user_id,
  i.financial_dimension_id,
  i.amount_due,
  i.due_date,
  i.status,
  coalesce(sum(t.amount) filter (where t.status = 'processed'), 0)::numeric(14,2) as amount_collected
from invoice i
left join transaction t on t.invoice_id = i.id
group by i.organization_id, i.id, i.athlete_user_id, i.financial_dimension_id, i.amount_due, i.due_date, i.status;

-- Grano: player x match (mismo grano que player_statistic).
create view fact_match_performance as
select organization_id, user_id as player_id, event_id, minutes_played, goals, cards
from player_statistic;

-- Grano: player x event (mismo grano que checkin_event) — asistencia de ATLETAS, distinta de
-- fact_hr_attendance (personal).
create view fact_attendance as
select organization_id, user_id as athlete_id, event_id, method, checked_in_at
from checkin_event;

-- Grano: player x match x callup_list. "Tasa de alternos" (UC-RPT-01) se deriva contando
-- status='alternate' vs 'accepted' sobre esta vista, no una columna propia.
create view fact_callup as
select
  cs.organization_id,
  cs.user_id as player_id,
  cl.event_id,
  cs.status,
  cs.priority_score,
  cs.responded_at
from callup_slot cs
join callup_list cl on cl.id = cs.callup_list_id;

-- Grano: employee x check-in — "carga de trabajo de coach" (UC-HR-02/05).
create view fact_hr_attendance as
select organization_id, employee_id, checked_in_at
from employee_attendance;
