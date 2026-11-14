begin;
-- Invoices (owner decision 2026-11-14: BookAtlas, not Stripe, handles VAT). One per paid Checkout
-- session, numbered sequentially by `seq`; kept 7 years (Dutch fiscal retention). Erasure removes the
-- buyer's name and email and replaces user_id with a marker.
create table if not exists public.bookatlas_invoices (
  seq bigint generated always as identity primary key,
  checkout_session_id text not null unique,
  payment_intent_id text,
  user_id text not null,
  buyer_email text,
  buyer_name text,
  buyer_country text check (buyer_country ~ '^[A-Z]{2}$'),
  vat_scheme text not null check (vat_scheme in ('nl-domestic','nl-eu-threshold','outside-eu','unknown-country-nl')),
  vat_rate_bp integer not null check (vat_rate_bp between 0 and 10000),
  currency text not null,
  amount_gross integer not null,
  amount_net integer not null,
  amount_vat integer not null,
  lines jsonb not null,
  status text not null default 'issued' check (status in ('issued','refunded')),
  issued_at timestamptz not null default now(),
  refunded_at timestamptz,
  check (amount_gross = amount_net + amount_vat)
);
create index if not exists bookatlas_invoices_user_idx on public.bookatlas_invoices (user_id, seq desc);
create index if not exists bookatlas_invoices_intent_idx on public.bookatlas_invoices (payment_intent_id);
create index if not exists bookatlas_invoices_issued_idx on public.bookatlas_invoices (issued_at);

alter table public.bookatlas_invoices enable row level security;
revoke all on table public.bookatlas_invoices from anon, authenticated;
grant select, insert, update, delete on table public.bookatlas_invoices to service_role;
commit;
