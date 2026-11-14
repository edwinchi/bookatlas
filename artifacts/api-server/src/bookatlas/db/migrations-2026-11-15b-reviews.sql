-- Reader reviews and ratings (TASK-0009). Run once in the Supabase SQL editor before deploying.
begin;
create table if not exists public.bookatlas_reviews (
  id uuid primary key,
  book_id text not null,
  user_id text not null,
  display_name text not null check (char_length(display_name) between 1 and 80),
  rating smallint not null check (rating between 1 and 5),
  title text check (char_length(title) <= 120),
  body text not null check (char_length(body) between 20 and 2000),
  verified_purchase boolean not null default false,
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, user_id)
);
create index if not exists bookatlas_reviews_book_idx on public.bookatlas_reviews (book_id, status, created_at desc);
create index if not exists bookatlas_reviews_user_idx on public.bookatlas_reviews (user_id);
alter table public.bookatlas_reviews enable row level security;
revoke all on table public.bookatlas_reviews from anon, authenticated;
grant select, insert, update, delete on table public.bookatlas_reviews to service_role;
commit;
