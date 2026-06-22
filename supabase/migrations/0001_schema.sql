-- ════════════════════════════════════════════════════════════
-- Foyer — Schéma de base (households, comptes, transactions, …)
-- Tout montant en numeric(14,2). EUR par défaut.
-- ════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────
create type connection_status as enum ('active', 'expired', 'error');
create type account_kind as enum ('checking', 'savings');
create type category_source as enum ('auto', 'manual', 'rule');
create type budget_period as enum ('monthly');
create type subscription_frequency as enum ('monthly', 'yearly', 'weekly');
create type alert_type as enum (
  'budget_exceeded', 'budget_warning', 'large_transaction',
  'new_subscription', 'consent_expiring', 'sync_error'
);

-- ── households ──────────────────────────────────────────────
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null default substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8),
  created_at timestamptz not null default now()
);

-- ── users (profil étendu, 1:1 avec auth.users) ──────────────
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  display_name text not null default 'Membre',
  avatar_color text not null default '#46c79a',
  push_subscription jsonb,
  created_at timestamptz not null default now()
);

-- ── bank_connections ────────────────────────────────────────
create table bank_connections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  owner_user_id uuid not null references users(id) on delete cascade,
  provider text not null default 'enablebanking',
  aspsp_name text not null,
  external_session_id text,
  consent_expires_at timestamptz,
  status connection_status not null default 'active',
  created_at timestamptz not null default now()
);
create index on bank_connections (household_id);

-- ── accounts ────────────────────────────────────────────────
create table accounts (
  id uuid primary key default gen_random_uuid(),
  bank_connection_id uuid not null references bank_connections(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  external_account_id text not null,
  name text not null,
  iban text,
  currency text not null default 'EUR',
  balance numeric(14,2) not null default 0,
  balance_updated_at timestamptz not null default now(),
  kind account_kind not null default 'checking',
  unique (bank_connection_id, external_account_id)
);
create index on accounts (household_id);

-- ── categories ──────────────────────────────────────────────
create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  icon text not null default 'circle-dashed',
  color text not null default '#a89e8c',
  parent_id uuid references categories(id) on delete set null,
  is_default boolean not null default false
);
create index on categories (household_id);

-- ── subscriptions ───────────────────────────────────────────
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  merchant_label text not null,
  amount numeric(14,2) not null,
  frequency subscription_frequency not null default 'monthly',
  next_expected_date date,
  category_id uuid references categories(id) on delete set null,
  is_confirmed boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on subscriptions (household_id);

-- ── transactions ────────────────────────────────────────────
create table transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  external_id text not null,
  booking_date date not null,
  amount numeric(14,2) not null,
  currency text not null default 'EUR',
  raw_label text not null default '',
  clean_label text not null default '',
  category_id uuid references categories(id) on delete set null,
  category_source category_source not null default 'auto',
  is_recurring boolean not null default false,
  subscription_id uuid references subscriptions(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Déduplication : un external_id est unique par compte.
  unique (account_id, external_id)
);
create index on transactions (household_id, booking_date desc);
create index on transactions (account_id);
create index on transactions (category_id);

-- ── budgets (enveloppes) ────────────────────────────────────
create table budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  amount numeric(14,2) not null,
  period budget_period not null default 'monthly',
  created_at timestamptz not null default now(),
  unique (household_id, category_id, period)
);
create index on budgets (household_id);

-- ── goals (objectifs d'épargne) ─────────────────────────────
create table goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  target_date date,
  linked_account_id uuid references accounts(id) on delete set null,
  color text not null default '#46c79a',
  created_at timestamptz not null default now()
);
create index on goals (household_id);

-- ── categorization_rules ────────────────────────────────────
create table categorization_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  match_pattern text not null,
  category_id uuid not null references categories(id) on delete cascade,
  priority int not null default 1,
  created_at timestamptz not null default now()
);
create index on categorization_rules (household_id);

-- ── alerts ──────────────────────────────────────────────────
create table alerts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  type alert_type not null,
  payload jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on alerts (household_id, created_at desc);
