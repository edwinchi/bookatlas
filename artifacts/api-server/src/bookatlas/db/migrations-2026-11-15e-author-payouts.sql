-- Author hub (cycle 6) and BooksAtlas Reader sync (cycle 7). Run once in the Supabase SQL editor; safe to run again.
begin;

-- Author payouts: where authors are paid (SEPA IBAN) and their tax details for DAC7 reporting.
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

-- Reader: the last place read in each book, per account (synced across devices).
create table if not exists public.bookatlas_reader_progress (
  user_id text not null,
  book_id text not null,
  chapter_index integer not null check (chapter_index >= 0),
  paragraph_index integer not null check (paragraph_index >= 0),
  progress_percent integer not null check (progress_percent between 0 and 100),
  device text,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- Reader: highlights, bookmarks and notes.
create table if not exists public.bookatlas_reader_annotations (
  id uuid primary key,
  user_id text not null,
  book_id text not null,
  kind text not null check (kind in ('highlight', 'bookmark', 'note')),
  color text check (color in ('yellow', 'green', 'blue', 'pink', 'purple', 'orange')),
  chapter_index integer not null check (chapter_index >= 0),
  paragraph_index integer not null check (paragraph_index >= 0),
  excerpt text not null default '',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookatlas_reader_annotations_user_book_idx on public.bookatlas_reader_annotations (user_id, book_id, created_at desc);

-- Reader: display and read-aloud settings.
create table if not exists public.bookatlas_reader_preferences (
  user_id text primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Reader: reading sessions, for reading time, speed and streaks.
create table if not exists public.bookatlas_reading_sessions (
  id uuid primary key,
  user_id text not null,
  book_id text not null,
  started_at timestamptz not null,
  seconds integer not null check (seconds between 0 and 21600),
  paragraphs integer not null default 0,
  words integer not null default 0,
  device text
);
create index if not exists bookatlas_reading_sessions_user_idx on public.bookatlas_reading_sessions (user_id, started_at desc);

-- Only the server (service role) reads and writes these tables.
alter table public.bookatlas_author_payouts enable row level security;
alter table public.bookatlas_reader_progress enable row level security;
alter table public.bookatlas_reader_annotations enable row level security;
alter table public.bookatlas_reader_preferences enable row level security;
alter table public.bookatlas_reading_sessions enable row level security;
revoke all on table public.bookatlas_author_payouts, public.bookatlas_reader_progress, public.bookatlas_reader_annotations,
  public.bookatlas_reader_preferences, public.bookatlas_reading_sessions from anon, authenticated;
grant select, insert, update, delete on table public.bookatlas_author_payouts, public.bookatlas_reader_progress, public.bookatlas_reader_annotations,
  public.bookatlas_reader_preferences, public.bookatlas_reading_sessions to service_role;

commit;
