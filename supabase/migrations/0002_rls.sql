-- ════════════════════════════════════════════════════════════
-- Row Level Security — cloisonnement strict par household_id.
-- Un utilisateur ne lit/écrit que les lignes de SON foyer.
-- ════════════════════════════════════════════════════════════

-- Foyer de l'utilisateur courant. STABLE + security definer pour
-- éviter la récursion RLS lors de la lecture de la table users.
create or replace function current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.users where id = auth.uid();
$$;

alter table households            enable row level security;
alter table users                 enable row level security;
alter table bank_connections      enable row level security;
alter table accounts              enable row level security;
alter table categories            enable row level security;
alter table subscriptions         enable row level security;
alter table transactions          enable row level security;
alter table budgets               enable row level security;
alter table goals                 enable row level security;
alter table categorization_rules  enable row level security;
alter table alerts                enable row level security;

-- households : on voit/édite seulement son propre foyer.
create policy household_select on households for select
  using (id = current_household_id());
create policy household_update on households for update
  using (id = current_household_id());

-- users : on voit les membres de son foyer ; on n'édite que soi-même.
create policy users_select on users for select
  using (household_id = current_household_id() or id = auth.uid());
create policy users_update on users for update
  using (id = auth.uid());
create policy users_insert on users for insert
  with check (id = auth.uid());

-- Macro : policy "tout par foyer" pour les tables de données.
do $$
declare t text;
begin
  foreach t in array array[
    'bank_connections','accounts','categories','subscriptions',
    'transactions','budgets','goals','categorization_rules','alerts'
  ] loop
    execute format(
      'create policy %1$s_all on %1$s for all
         using (household_id = current_household_id())
         with check (household_id = current_household_id());', t);
  end loop;
end $$;
