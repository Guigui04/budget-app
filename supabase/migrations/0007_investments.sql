-- ════════════════════════════════════════════════════════════
-- Patrimoine / investissement
--  • investment_holdings : positions du foyer (actions, ETF, crypto,
--    livret, immobilier…). Cloisonné par household_id (RLS).
--  • market_quotes : cache des cours de marché (clé = symbole). Écrit
--    uniquement par l'Edge Function `quotes` (service role), lu par les
--    utilisateurs authentifiés.
-- ════════════════════════════════════════════════════════════

create table investment_holdings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  kind text not null default 'other'
    check (kind in ('etf','stock','crypto','fund','livret','real_estate','cash','other')),
  symbol text,
  name text not null,
  quantity numeric(20,8) not null default 1,
  cost_basis numeric(14,2) not null default 0,
  currency text not null default 'EUR',
  envelope text not null default 'autre'
    check (envelope in ('PEA','AV','CTO','crypto','livret','autre')),
  manual_value numeric(14,2),
  linked_account_id uuid references accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index investment_holdings_household_idx on investment_holdings(household_id);

create table market_quotes (
  symbol text primary key,
  price numeric(20,8) not null,
  currency text not null default 'EUR',
  change_pct numeric(8,4) not null default 0,
  as_of timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────
alter table investment_holdings enable row level security;
alter table market_quotes       enable row level security;

-- Positions : tout par foyer (même macro que les autres tables de données).
create policy investment_holdings_all on investment_holdings for all
  using (household_id = current_household_id())
  with check (household_id = current_household_id());

-- Cours : lecture seule pour les utilisateurs authentifiés. L'écriture passe
-- par le service role (Edge Function), qui contourne RLS.
create policy market_quotes_select on market_quotes for select
  using (auth.role() = 'authenticated');
