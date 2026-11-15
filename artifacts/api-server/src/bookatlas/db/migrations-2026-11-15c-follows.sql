-- Follow authors (cycle 5c). Run once in the Supabase SQL editor before deploying.
-- A follow is the reader's explicit consent to e-mails about that author's new books.
begin;
create table if not exists public.bookatlas_follows (
  user_id text not null,
  author_slug text not null check (author_slug ~ '^[a-z0-9-]{2,80}$'),
  author_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, author_slug)
);
create index if not exists bookatlas_follows_author_idx on public.bookatlas_follows (author_slug);
alter table public.bookatlas_follows enable row level security;
revoke all on table public.bookatlas_follows from anon, authenticated;
grant select, insert, update, delete on table public.bookatlas_follows to service_role;
commit;
