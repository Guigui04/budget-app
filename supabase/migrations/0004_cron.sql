-- ════════════════════════════════════════════════════════════
-- Planification serveur (cron). À exécuter APRÈS avoir déposé les
-- secrets dans Vault. Synchro quotidienne + détection + alertes.
--
-- Prérequis (une fois, dans le SQL editor du projet) :
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
-- ════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Helper : appelle une Edge Function avec la clé service role.
create or replace function invoke_edge_function(fn text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  key text;
begin
  select decrypted_secret into base from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into key  from vault.decrypted_secrets where name = 'service_role_key';
  perform net.http_post(
    url := base || '/functions/v1/' || fn,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || key),
    body := '{}'::jsonb
  );
end $$;

-- Synchro bancaire : tous les jours à 06:00 UTC.
select cron.schedule('foyer-bank-sync', '0 6 * * *', $$ select invoke_edge_function('bank-sync'); $$);

-- Détection d'abonnements : tous les jours à 06:20 UTC.
select cron.schedule('foyer-detect-subs', '20 6 * * *', $$ select invoke_edge_function('detect-subscriptions'); $$);

-- Évaluation des budgets / alertes : toutes les 6 heures.
select cron.schedule('foyer-alerts', '0 */6 * * *', $$ select invoke_edge_function('alerts'); $$);
