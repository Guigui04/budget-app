-- Harden RPC/function execution grants.
-- SECURITY DEFINER functions stay callable only by the roles that need them.

revoke all on function current_household_id() from public;
grant execute on function current_household_id() to authenticated;

revoke all on function seed_default_categories(uuid) from public;

revoke all on function create_household(text) from public;
grant execute on function create_household(text) to authenticated;

revoke all on function join_household(text) from public;
grant execute on function join_household(text) to authenticated;
