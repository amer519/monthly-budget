-- ============================================================================
-- Monthly Budget App — Supabase schema
-- Run this once in the Supabase SQL Editor (Project → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.
-- ============================================================================

-- All money is stored as integer cents (bigint) to avoid floating point
-- rounding bugs. The app converts to/from dollars for display only.

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles: one row per user, holds income + season defaults
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  monthly_income_cents bigint not null default 586462 check (monthly_income_cents >= 0),
  summer_gas_cents bigint not null default 1200 check (summer_gas_cents >= 0),
  summer_flex_target_cents bigint not null default 55000 check (summer_flex_target_cents >= 0),
  summer_savings_target_cents bigint not null default 60000 check (summer_savings_target_cents >= 0),
  winter_gas_cents bigint not null default 17500 check (winter_gas_cents >= 0),
  winter_flex_target_cents bigint not null default 50000 check (winter_flex_target_cents >= 0),
  winter_savings_target_cents bigint not null default 50000 check (winter_savings_target_cents >= 0),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- bill_templates: the reusable list of bills used to seed each new month
-- ----------------------------------------------------------------------------
create table if not exists public.bill_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  default_amount_cents bigint not null default 0 check (default_amount_cents >= 0),
  type text not null check (type in ('fixed', 'variable')),
  active boolean not null default true,
  is_gas boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists bill_templates_user_idx on public.bill_templates (user_id, sort_order);

-- ----------------------------------------------------------------------------
-- monthly_budgets: one row per calendar month
-- ----------------------------------------------------------------------------
create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2000 and 2100),
  season text not null check (season in ('summer', 'winter')),
  income_cents bigint not null default 0 check (income_cents >= 0),
  flex_target_cents bigint not null default 0 check (flex_target_cents >= 0),
  savings_target_cents bigint not null default 0 check (savings_target_cents >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, year, month)
);

create index if not exists monthly_budgets_user_idx on public.monthly_budgets (user_id, year, month);

-- ----------------------------------------------------------------------------
-- monthly_bills: bill line items belonging to a monthly_budget
-- ----------------------------------------------------------------------------
create table if not exists public.monthly_bills (
  id uuid primary key default gen_random_uuid(),
  monthly_budget_id uuid not null references public.monthly_budgets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  bill_template_id uuid references public.bill_templates (id) on delete set null,
  name text not null check (char_length(trim(name)) > 0),
  type text not null check (type in ('fixed', 'variable')),
  expected_amount_cents bigint not null default 0 check (expected_amount_cents >= 0),
  actual_amount_cents bigint check (actual_amount_cents is null or actual_amount_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'paid')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists monthly_bills_budget_idx on public.monthly_bills (monthly_budget_id, sort_order);

-- ----------------------------------------------------------------------------
-- flex_transactions: individual Flex Fund purchases
--
-- `category` and `person_tag` are free text (not foreign keys) that
-- typically match a label from flex_tags at the time of entry. Storing a
-- copy here — rather than referencing flex_tags.id — means editing or
-- deleting a tag later never changes what past transactions say, the same
-- way editing a bill_template never rewrites past months' bills.
-- ----------------------------------------------------------------------------
create table if not exists public.flex_transactions (
  id uuid primary key default gen_random_uuid(),
  monthly_budget_id uuid not null references public.monthly_budgets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null check (char_length(trim(description)) > 0),
  amount_cents bigint not null check (amount_cents >= 0),
  category text,
  person_tag text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists flex_transactions_budget_idx on public.flex_transactions (monthly_budget_id, transaction_date desc);

-- Older installs created `category` with a fixed CHECK constraint tying it to
-- a hardcoded list (shopping/dining/child/home/car/entertainment/other).
-- Tags are now user-editable via flex_tags, so that constraint no longer
-- applies — this drops it if present and is a no-op otherwise.
alter table public.flex_transactions drop constraint if exists flex_transactions_category_check;
alter table public.flex_transactions add column if not exists person_tag text;

-- ----------------------------------------------------------------------------
-- flex_tags: user-editable quick-pick lists for the Add Flex Purchase sheet.
-- Three kinds of tag share one table since they're managed identically:
--   'vendor'   — quick-fills the description (Amazon, Target, UberEats…)
--   'person'   — who the purchase was for (Amer, Shimaa, Yousef…)
--   'category' — type of purchase (Household Item, Fun Item…)
-- ----------------------------------------------------------------------------
create table if not exists public.flex_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tag_type text not null check (tag_type in ('vendor', 'person', 'category')),
  label text not null check (char_length(trim(label)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists flex_tags_user_idx on public.flex_tags (user_id, tag_type, sort_order);

-- ============================================================================
-- Row Level Security — every table is scoped to auth.uid()
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.bill_templates enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.monthly_bills enable row level security;
alter table public.flex_transactions enable row level security;
alter table public.flex_tags enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

drop policy if exists "bill_templates_select_own" on public.bill_templates;
drop policy if exists "bill_templates_insert_own" on public.bill_templates;
drop policy if exists "bill_templates_update_own" on public.bill_templates;
drop policy if exists "bill_templates_delete_own" on public.bill_templates;
create policy "bill_templates_select_own" on public.bill_templates for select using (auth.uid() = user_id);
create policy "bill_templates_insert_own" on public.bill_templates for insert with check (auth.uid() = user_id);
create policy "bill_templates_update_own" on public.bill_templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bill_templates_delete_own" on public.bill_templates for delete using (auth.uid() = user_id);

drop policy if exists "monthly_budgets_select_own" on public.monthly_budgets;
drop policy if exists "monthly_budgets_insert_own" on public.monthly_budgets;
drop policy if exists "monthly_budgets_update_own" on public.monthly_budgets;
drop policy if exists "monthly_budgets_delete_own" on public.monthly_budgets;
create policy "monthly_budgets_select_own" on public.monthly_budgets for select using (auth.uid() = user_id);
create policy "monthly_budgets_insert_own" on public.monthly_budgets for insert with check (auth.uid() = user_id);
create policy "monthly_budgets_update_own" on public.monthly_budgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "monthly_budgets_delete_own" on public.monthly_budgets for delete using (auth.uid() = user_id);

drop policy if exists "monthly_bills_select_own" on public.monthly_bills;
drop policy if exists "monthly_bills_insert_own" on public.monthly_bills;
drop policy if exists "monthly_bills_update_own" on public.monthly_bills;
drop policy if exists "monthly_bills_delete_own" on public.monthly_bills;
create policy "monthly_bills_select_own" on public.monthly_bills for select using (auth.uid() = user_id);
create policy "monthly_bills_insert_own" on public.monthly_bills for insert with check (auth.uid() = user_id);
create policy "monthly_bills_update_own" on public.monthly_bills for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "monthly_bills_delete_own" on public.monthly_bills for delete using (auth.uid() = user_id);

drop policy if exists "flex_transactions_select_own" on public.flex_transactions;
drop policy if exists "flex_transactions_insert_own" on public.flex_transactions;
drop policy if exists "flex_transactions_update_own" on public.flex_transactions;
drop policy if exists "flex_transactions_delete_own" on public.flex_transactions;
create policy "flex_transactions_select_own" on public.flex_transactions for select using (auth.uid() = user_id);
create policy "flex_transactions_insert_own" on public.flex_transactions for insert with check (auth.uid() = user_id);
create policy "flex_transactions_update_own" on public.flex_transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "flex_transactions_delete_own" on public.flex_transactions for delete using (auth.uid() = user_id);

drop policy if exists "flex_tags_select_own" on public.flex_tags;
drop policy if exists "flex_tags_insert_own" on public.flex_tags;
drop policy if exists "flex_tags_update_own" on public.flex_tags;
drop policy if exists "flex_tags_delete_own" on public.flex_tags;
create policy "flex_tags_select_own" on public.flex_tags for select using (auth.uid() = user_id);
create policy "flex_tags_insert_own" on public.flex_tags for insert with check (auth.uid() = user_id);
create policy "flex_tags_update_own" on public.flex_tags for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "flex_tags_delete_own" on public.flex_tags for delete using (auth.uid() = user_id);

-- ============================================================================
-- Seed defaults automatically whenever a new auth user is created.
-- This is what lets you sign in immediately after creating your account
-- and see a pre-populated budget, with no manual setup screen required.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.bill_templates (user_id, name, default_amount_cents, type, is_gas, sort_order)
  values
    (new.id, 'Mortgage / Taxes / Homeowners / PMI', 194300, 'fixed', false, 1),
    (new.id, 'Tesla', 64600, 'fixed', false, 2),
    (new.id, 'Solar', 20000, 'fixed', false, 3),
    (new.id, 'Car Insurance', 35300, 'fixed', false, 4),
    (new.id, 'Comcast', 13000, 'fixed', false, 5),
    (new.id, 'Water', 11000, 'variable', false, 6),
    (new.id, 'Groceries', 73700, 'variable', false, 7),
    (new.id, 'Electric', 40000, 'variable', false, 8),
    (new.id, 'Gas', 1200, 'variable', true, 9),
    (new.id, 'Streaming Services', 7000, 'variable', false, 10);

  insert into public.flex_tags (user_id, tag_type, label, sort_order)
  values
    (new.id, 'vendor', 'Amazon', 1),
    (new.id, 'vendor', 'Target', 2),
    (new.id, 'vendor', 'UberEats', 3),
    (new.id, 'vendor', 'Walmart', 4),
    (new.id, 'person', 'Amer', 1),
    (new.id, 'person', 'Shimaa', 2),
    (new.id, 'person', 'Yousef', 3),
    (new.id, 'category', 'Household Item', 1),
    (new.id, 'category', 'Fun Item', 2),
    (new.id, 'category', 'Clothing', 3),
    (new.id, 'category', 'Dining', 4),
    (new.id, 'category', 'Gift', 5),
    (new.id, 'category', 'Electronics', 6),
    (new.id, 'category', 'Other', 7);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Backfill: if you already ran an earlier version of this script and already
-- have a user, the trigger above won't fire again for you. This adds the
-- default flex_tags to any existing user who doesn't have any yet — safe to
-- re-run, and it will never duplicate or touch tags you've already edited.
-- ============================================================================

insert into public.flex_tags (user_id, tag_type, label, sort_order)
select u.id, v.tag_type, v.label, v.sort_order
from auth.users u
cross join (
  values
    ('vendor', 'Amazon', 1),
    ('vendor', 'Target', 2),
    ('vendor', 'UberEats', 3),
    ('vendor', 'Walmart', 4),
    ('person', 'Amer', 1),
    ('person', 'Shimaa', 2),
    ('person', 'Yousef', 3),
    ('category', 'Household Item', 1),
    ('category', 'Fun Item', 2),
    ('category', 'Clothing', 3),
    ('category', 'Dining', 4),
    ('category', 'Gift', 5),
    ('category', 'Electronics', 6),
    ('category', 'Other', 7)
) as v (tag_type, label, sort_order)
where not exists (
  select 1 from public.flex_tags ft where ft.user_id = u.id and ft.tag_type = v.tag_type
);

-- ============================================================================
-- Done. Next: create your one user in Authentication → Users (see README),
-- then sign in — your profile, bills, and first month populate automatically.
-- ============================================================================
