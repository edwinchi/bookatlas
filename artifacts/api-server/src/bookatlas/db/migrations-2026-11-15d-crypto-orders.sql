-- Crypto payments through CoinGate (paid out in EUR). Run once in the Supabase SQL editor before deploying.
begin;
create table if not exists public.bookatlas_crypto_orders (
  id uuid primary key,
  user_id text not null,
  email text,
  name text,
  book_ids text[] not null,
  lines jsonb not null,
  amount_cents integer not null,
  waiver_at timestamptz not null,
  callback_token text not null,
  coingate_id bigint unique,
  status text not null default 'new' check (status in ('new','pending','confirming','paid','invalid','expired','canceled','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookatlas_crypto_orders_user_idx on public.bookatlas_crypto_orders (user_id, created_at desc);
alter table public.bookatlas_crypto_orders enable row level security;
revoke all on table public.bookatlas_crypto_orders from anon, authenticated;
grant select, insert, update, delete on table public.bookatlas_crypto_orders to service_role;
commit;
