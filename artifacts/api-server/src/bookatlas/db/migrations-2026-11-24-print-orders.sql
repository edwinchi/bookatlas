-- Printed books sold and shipped by BooksAtlas (printed on demand by Lulu). Run once in the Supabase SQL editor
-- before printed copies go on sale. The print PDFs live in the private storage bucket "bookatlas-print", which the
-- server creates on first use.
begin;
create table if not exists public.bookatlas_print_orders (
  id uuid primary key,
  user_id text not null,
  book_id text not null,
  title text not null,
  quantity integer not null check (quantity between 1 and 10),
  shipping_level text not null,
  address jsonb not null,
  quote jsonb not null,
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','paid','submitted','in_production','shipped','canceled','refunded','needs_attention')),
  checkout_session_id text unique,
  payment_intent_id text,
  lulu_job_id bigint unique,
  lulu_status text,
  tracking jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookatlas_print_orders_user_idx on public.bookatlas_print_orders (user_id, created_at desc);
create index if not exists bookatlas_print_orders_intent_idx on public.bookatlas_print_orders (payment_intent_id);
alter table public.bookatlas_print_orders enable row level security;
revoke all on table public.bookatlas_print_orders from anon, authenticated;
grant select, insert, update, delete on table public.bookatlas_print_orders to service_role;
commit;
