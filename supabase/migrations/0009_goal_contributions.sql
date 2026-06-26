-- ════════════════════════════════════════════════════════════
-- Versements d'objectifs — historise chaque apport vers un objectif.
-- Sert à estimer le rythme d'épargne (ETA, courbe de projection) et à
-- afficher la chronologie des versements, attribuée à un membre du foyer
-- (foyer partagé). Cloisonné par household_id (RLS).
-- ════════════════════════════════════════════════════════════

create table goal_contributions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  goal_id uuid not null references goals(id) on delete cascade,
  amount numeric(14,2) not null,
  contributed_at date not null default current_date,
  author_user_id uuid references users(id) on delete set null,
  author_name text,
  created_at timestamptz not null default now()
);

create index goal_contributions_household_idx on goal_contributions(household_id);
create index goal_contributions_goal_idx on goal_contributions(goal_id, contributed_at);

alter table goal_contributions enable row level security;

create policy goal_contributions_all on goal_contributions for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());
