-- Reading Intelligence phase 3 (2026-11-25): schools and teams. A teacher or team lead makes a class, shares its
-- invite code, sets a reading list and sees each member's progress on it. Run once in the Supabase SQL editor
-- before deploying this release; safe to run again.
begin;

create table if not exists public.bookatlas_reading_classes (
  id uuid primary key,
  owner_id text not null,
  name text not null check (char_length(name) between 2 and 80),
  kind text not null default 'class' check (kind in ('class', 'team')),
  invite_code text not null unique,
  books jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists bookatlas_reading_classes_owner_idx on public.bookatlas_reading_classes (owner_id);

create table if not exists public.bookatlas_reading_class_members (
  class_id uuid not null references public.bookatlas_reading_classes (id) on delete cascade,
  user_id text not null,
  display_name text not null,
  role text not null check (role in ('teacher', 'member')),
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
create index if not exists bookatlas_reading_class_members_user_idx on public.bookatlas_reading_class_members (user_id);

alter table public.bookatlas_reading_classes enable row level security;
alter table public.bookatlas_reading_class_members enable row level security;
revoke all on table public.bookatlas_reading_classes, public.bookatlas_reading_class_members from anon, authenticated;
grant select, insert, update, delete on table public.bookatlas_reading_classes, public.bookatlas_reading_class_members to service_role;

commit;
