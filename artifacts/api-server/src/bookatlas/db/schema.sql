-- Bookatlas Supabase schema.
-- Review and run in the intended Supabase project's SQL Editor, or through a
-- separately authorized PostgreSQL administrator connection. The REST service
-- key alone cannot create these tables. This script does not insert demo data
-- or delete records. Keep service-role credentials on the server only.
-- Every table and index below is Bookatlas-prefixed. Existing unprefixed
-- tables (including public.categories) are deliberately left untouched.
begin;

-- An incompatible already-prefixed table also requires explicit review.
do $$
begin
  if to_regclass('public.bookatlas_categories') is not null and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookatlas_categories' and column_name = 'name'
  ) then
    raise exception 'Setup stopped: existing bookatlas_categories has an incompatible schema. Review it before proceeding.';
  end if;
end $$;

create table if not exists public.bookatlas_books (
  id text primary key,
  title text not null,
  author text not null,
  primary_genre text,
  price numeric,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists bookatlas_books_primary_genre_idx on public.bookatlas_books (primary_genre);

create table if not exists public.bookatlas_categories (
  name text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.bookatlas_registered_users (
  email text primary key,
  name text,
  registered_at bigint not null,
  last_active bigint not null,
  reading_streak integer not null default 0,
  books_read integer not null default 0
);

create table if not exists public.bookatlas_subscribers (
  email text primary key,
  name text,
  tier text,
  status text not null default 'subscribed',
  subscribed_at bigint not null,
  unsubscribed_at bigint,
  tags jsonb not null default '[]',
  source text,
  unsubscribe_token text not null,
  emails_received_count integer not null default 0,
  last_email_sent_at bigint,
  last_opened_at bigint,
  last_clicked_at bigint,
  bounce_reason text,
  reading_interests jsonb,
  user_discount_code text,
  reading_streak_days integer,
  pages_read_total integer
);
create index if not exists bookatlas_subscribers_status_idx on public.bookatlas_subscribers (status);

create table if not exists public.bookatlas_campaigns (
  id text primary key,
  sent_at bigint not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- Existing/seeded contacts are NOT assumed to have consented to marketing.
alter table public.bookatlas_subscribers add column if not exists marketing_consent_at timestamptz;
alter table public.bookatlas_subscribers add column if not exists marketing_consent_source text;
alter table public.bookatlas_subscribers add column if not exists is_demo boolean not null default true;
alter table public.bookatlas_subscribers add column if not exists suppressed boolean not null default false;

-- Job payloads contain metadata and private object paths, never uploaded files,
-- full manuscript text, EPUB bytes, or audio encoded as base64.
create table if not exists public.bookatlas_publishing_jobs (
  id uuid primary key,
  owner_id text not null,
  status text not null default 'queued'
    check (status in ('queued','running','review','published','failed','cancelled')),
  stage text not null default 'upload',
  version integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  is_test boolean not null default true,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookatlas_publishing_jobs_queue_idx
  on public.bookatlas_publishing_jobs (status, lease_until, created_at);

create table if not exists public.bookatlas_publishing_messages (
  id text primary key,
  job_id uuid not null references public.bookatlas_publishing_jobs(id),
  recipient text not null,
  kind text not null check (kind in ('publisher','reader','test')),
  status text not null default 'queued'
    check (status in ('queued','sending','accepted','delivered','failed','suppressed','unknown')),
  provider_id text,
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, recipient, kind)
);

-- Controlled fixtures are isolated from the public books table.
create table if not exists public.bookatlas_publishing_test_books (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- eBook submissions (TASK-0003). Files live in the private Storage bucket `bookatlas-ebooks`;
-- rows hold intake answers, the preparation report and object keys, never file bytes.
create table if not exists public.bookatlas_ebook_submissions (
  id uuid primary key,
  owner_id text not null,
  status text not null default 'uploading'
    check (status in ('uploading','preparing','checking','ready','needs_author','published','rejected')),
  data jsonb not null default '{}',
  book_id text,
  lease_until timestamptz,
  purge_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookatlas_ebook_submissions_owner_idx on public.bookatlas_ebook_submissions (owner_id, created_at desc);
create index if not exists bookatlas_ebook_submissions_queue_idx on public.bookatlas_ebook_submissions (status, lease_until);

-- Store rejection messages, matched to preparation rules so future books are checked for them.
create table if not exists public.bookatlas_prep_feedback (
  id uuid primary key,
  submission_id uuid references public.bookatlas_ebook_submissions(id),
  store text not null,
  message text not null,
  matched_rules text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Only the backend service role may access application tables directly.
-- Public catalog requests still go through Bookatlas's explicit public API.
alter table public.bookatlas_books enable row level security;
alter table public.bookatlas_categories enable row level security;
alter table public.bookatlas_registered_users enable row level security;
alter table public.bookatlas_subscribers enable row level security;
alter table public.bookatlas_campaigns enable row level security;
alter table public.bookatlas_publishing_jobs enable row level security;
alter table public.bookatlas_publishing_messages enable row level security;
alter table public.bookatlas_publishing_test_books enable row level security;
alter table public.bookatlas_ebook_submissions enable row level security;
alter table public.bookatlas_prep_feedback enable row level security;
revoke all on table public.bookatlas_books, public.bookatlas_categories,
  public.bookatlas_registered_users, public.bookatlas_subscribers, public.bookatlas_campaigns,
  public.bookatlas_publishing_jobs, public.bookatlas_publishing_messages,
  public.bookatlas_publishing_test_books, public.bookatlas_ebook_submissions,
  public.bookatlas_prep_feedback from anon, authenticated;
grant select, insert, update, delete on table public.bookatlas_books, public.bookatlas_categories,
  public.bookatlas_registered_users, public.bookatlas_subscribers, public.bookatlas_campaigns,
  public.bookatlas_publishing_jobs, public.bookatlas_publishing_messages,
  public.bookatlas_publishing_test_books, public.bookatlas_ebook_submissions,
  public.bookatlas_prep_feedback to service_role;
commit;
