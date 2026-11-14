-- Natural audiobook narration (TASK-0008). Run once in the Supabase SQL editor before deploying.
begin;
create table if not exists public.bookatlas_narrations (
  id uuid primary key,
  book_id text not null,
  owner_id text not null,
  title text not null,
  voice text not null check (voice in ('Sulafat','Charon')),
  status text not null check (status in ('awaiting_payment','paid','approved','running','done','failed','declined','refunded')),
  price_cents integer not null,
  words integer not null,
  estimate_micros bigint not null,
  spent_micros bigint not null default 0,
  segments jsonb not null,
  done integer not null default 0,
  total integer not null,
  seconds numeric not null default 0,
  checkout_session_id text unique,
  payment_intent_id text,
  lease_token text,
  lease_until timestamptz,
  error text,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookatlas_narrations_book_idx on public.bookatlas_narrations (book_id, created_at desc);
create index if not exists bookatlas_narrations_owner_idx on public.bookatlas_narrations (owner_id, created_at desc);
create index if not exists bookatlas_narrations_status_idx on public.bookatlas_narrations (status);
alter table public.bookatlas_narrations enable row level security;
revoke all on table public.bookatlas_narrations from anon, authenticated;
grant select, insert, update, delete on table public.bookatlas_narrations to service_role;

-- Narration is a service (21% Dutch VAT), not an e-book (9%): invoices may carry the service scheme.
alter table public.bookatlas_invoices drop constraint if exists bookatlas_invoices_vat_scheme_check;
alter table public.bookatlas_invoices add constraint bookatlas_invoices_vat_scheme_check
  check (vat_scheme in ('nl-domestic','nl-eu-threshold','outside-eu','unknown-country-nl','nl-service'));
commit;
