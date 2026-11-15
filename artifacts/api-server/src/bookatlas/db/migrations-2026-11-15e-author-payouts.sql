-- Author hub (cycle 6): where authors are paid (SEPA IBAN) and their tax details for DAC7 reporting.
-- Run once in the Supabase SQL editor before deploying.
begin;
create table if not exists public.bookatlas_author_payouts (
  user_id text primary key,
  account_holder text not null,
  iban text not null,
  bic text,
  address text not null,
  country text not null check (country ~ '^[A-Z]{2}$'),
  tax_id text,
  vat_id text,
  business boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.bookatlas_author_payouts enable row level security;
revoke all on table public.bookatlas_author_payouts from anon, authenticated;
grant select, insert, update, delete on table public.bookatlas_author_payouts to service_role;
commit;
