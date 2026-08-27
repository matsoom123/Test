-- Finance Tracker database schema
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null check (amount > 0),
  category text not null,
  date date not null,
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  amount numeric not null check (amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, category)
);

alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

-- Each user can only ever see/change their own rows.
create policy "Users manage their own transactions"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own budgets"
  on public.budgets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists transactions_user_id_date_idx
  on public.transactions (user_id, date desc);
