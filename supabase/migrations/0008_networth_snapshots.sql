-- ════════════════════════════════════════════════════════════
-- Historique de valeur nette — un point par jour et par foyer.
-- Alimente la courbe de patrimoine. Écrit côté client (RLS foyer) à
-- l'ouverture du hub : un seul point par jour grâce à la contrainte d'unicité.
-- ════════════════════════════════════════════════════════════

create table networth_snapshots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  as_of date not null,
  total numeric(14,2) not null,
  cash numeric(14,2) not null default 0,
  invested numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, as_of)
);

create index networth_snapshots_household_idx on networth_snapshots(household_id, as_of);

alter table networth_snapshots enable row level security;

create policy networth_snapshots_all on networth_snapshots for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());
