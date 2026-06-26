-- ════════════════════════════════════════════════════════════
-- Épargne automatique — règles de mise de côté.
-- L'app ne peut pas initier de virement (PISP hors périmètre) : ces règles
-- servent à COMPTABILISER l'argent à mettre de côté (arrondis, balayage du
-- surplus, % du revenu, déclencheur par catégorie), calculé sur les données
-- déjà présentes. Cloisonné par household_id (RLS).
-- ════════════════════════════════════════════════════════════

create table savings_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  type text not null
    check (type in ('roundup','surplus_sweep','income_pct','category_trigger')),
  enabled boolean not null default true,
  round_to numeric(8,2),
  multiplier numeric(6,2),
  percent numeric(6,2),
  category_id uuid references categories(id) on delete set null,
  amount numeric(14,2),
  target_goal_id uuid references goals(id) on delete set null,
  created_at timestamptz not null default now()
);

create index savings_rules_household_idx on savings_rules(household_id);

alter table savings_rules enable row level security;

create policy savings_rules_all on savings_rules for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());
