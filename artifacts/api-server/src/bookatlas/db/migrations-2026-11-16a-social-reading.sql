-- BooksAtlas Reader Phase 3 (cycle 10): shared notes, reading groups and reports. Run once in the Supabase SQL editor; safe to run again.
begin;

-- Shared annotations: a reader may share a highlight or note with other readers of the book (first name and initial).
alter table public.bookatlas_reader_annotations add column if not exists shared boolean not null default false;
alter table public.bookatlas_reader_annotations add column if not exists display_name text;
alter table public.bookatlas_reader_annotations add column if not exists hidden boolean not null default false;
create index if not exists bookatlas_reader_annotations_book_chapter_idx on public.bookatlas_reader_annotations (book_id, chapter_index, kind);

-- Reading groups: a private group around one book, joined with an invite code.
create table if not exists public.bookatlas_reading_groups (
  id uuid primary key,
  book_id text not null,
  name text not null check (char_length(name) between 2 and 80),
  owner_id text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists bookatlas_reading_groups_owner_idx on public.bookatlas_reading_groups (owner_id);

create table if not exists public.bookatlas_reading_group_members (
  group_id uuid not null references public.bookatlas_reading_groups (id) on delete cascade,
  user_id text not null,
  display_name text not null,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists bookatlas_reading_group_members_user_idx on public.bookatlas_reading_group_members (user_id);

-- Group discussion, optionally about one chapter (shown behind a spoiler guard to readers not there yet).
create table if not exists public.bookatlas_reading_group_posts (
  id uuid primary key,
  group_id uuid not null references public.bookatlas_reading_groups (id) on delete cascade,
  user_id text not null,
  display_name text not null,
  chapter_index integer check (chapter_index >= 0),
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);
create index if not exists bookatlas_reading_group_posts_group_idx on public.bookatlas_reading_group_posts (group_id, created_at desc);

-- Reports of shared notes and group posts; three reports hide the item until an administrator decides.
create table if not exists public.bookatlas_reader_reports (
  id uuid primary key,
  kind text not null check (kind in ('annotation', 'post')),
  target_id uuid not null,
  reporter_id text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (kind, target_id, reporter_id)
);

-- Only the server (service role) reads and writes these tables.
alter table public.bookatlas_reading_groups enable row level security;
alter table public.bookatlas_reading_group_members enable row level security;
alter table public.bookatlas_reading_group_posts enable row level security;
alter table public.bookatlas_reader_reports enable row level security;
revoke all on table public.bookatlas_reading_groups, public.bookatlas_reading_group_members, public.bookatlas_reading_group_posts,
  public.bookatlas_reader_reports from anon, authenticated;
grant select, insert, update, delete on table public.bookatlas_reading_groups, public.bookatlas_reading_group_members, public.bookatlas_reading_group_posts,
  public.bookatlas_reader_reports to service_role;

commit;
