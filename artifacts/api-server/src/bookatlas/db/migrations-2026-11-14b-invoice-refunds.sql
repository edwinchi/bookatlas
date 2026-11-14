-- Follow-up to migrations-2026-11-14-invoices.sql: adds the refund-request and withdrawal-waiver columns.
-- Safe to run more than once, and safe if the first migration already included them.
begin;
alter table public.bookatlas_invoices add column if not exists withdrawal_waiver_at timestamptz;
alter table public.bookatlas_invoices add column if not exists refund_requested_at timestamptz;
alter table public.bookatlas_invoices add column if not exists refund_reason text check (char_length(refund_reason) <= 1000);
alter table public.bookatlas_invoices add column if not exists refund_decision text check (refund_decision in ('approved','declined'));
alter table public.bookatlas_invoices add column if not exists refund_decided_at timestamptz;
alter table public.bookatlas_invoices add column if not exists refund_decided_by text;
create index if not exists bookatlas_invoices_refund_idx on public.bookatlas_invoices (refund_requested_at) where refund_requested_at is not null;
commit;
