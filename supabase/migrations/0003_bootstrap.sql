-- ════════════════════════════════════════════════════════════
-- Bootstrap : création du profil à l'inscription, création /
-- rattachement à un foyer, et catégories par défaut.
-- ════════════════════════════════════════════════════════════

-- Crée la ligne profil `users` à chaque inscription Supabase Auth.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Insère le jeu de catégories par défaut pour un foyer.
create or replace function seed_default_categories(hh uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.categories (household_id, name, icon, color, is_default) values
    (hh, 'Courses', 'shopping-cart', '#46c79a', true),
    (hh, 'Restaurants', 'utensils', '#f0784a', true),
    (hh, 'Transport', 'car', '#6fa8dc', true),
    (hh, 'Logement', 'home', '#b58df1', true),
    (hh, 'Énergie', 'zap', '#e8b24c', true),
    (hh, 'Abonnements', 'repeat', '#ef6f9c', true),
    (hh, 'Loisirs', 'party-popper', '#4ec5d4', true),
    (hh, 'Santé', 'heart-pulse', '#f2647d', true),
    (hh, 'Shopping', 'shopping-bag', '#d99ad6', true),
    (hh, 'Voyages', 'plane', '#5fb0c9', true),
    (hh, 'Salaire', 'briefcase', '#46c79a', true),
    (hh, 'Épargne', 'piggy-bank', '#7fd1a8', true),
    (hh, 'Autres', 'circle-dashed', '#a89e8c', true);
$$;

-- Crée un foyer, rattache l'utilisateur courant, sème les catégories.
create or replace function create_household(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  hh uuid;
  code text;
begin
  insert into public.households (name) values (p_name)
  returning id, invite_code into hh, code;

  update public.users set household_id = hh where id = auth.uid();
  perform seed_default_categories(hh);
  return code;
end $$;

-- Rattache l'utilisateur courant à un foyer existant via son code.
create or replace function join_household(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare hh uuid;
begin
  select id into hh from public.households where invite_code = p_code;
  if hh is null then
    raise exception 'Code d''invitation invalide';
  end if;
  update public.users set household_id = hh where id = auth.uid();
end $$;

revoke all on function create_household(text) from anon;
revoke all on function join_household(text) from anon;
