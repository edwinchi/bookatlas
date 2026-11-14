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

-- Catalogue at scale (TASK-0005): indexed columns, full-text search and precomputed category
-- counts so 1.5M+ titles answer in milliseconds. `data` keeps the whole record, `card` the list view.
alter table public.bookatlas_books
  add column if not exists card jsonb,
  add column if not exists subtitle text,
  add column if not exists genres text[] not null default '{}',
  add column if not exists format text,
  add column if not exists language text,
  add column if not exists original_price numeric,
  add column if not exists rating numeric not null default 0,
  add column if not exists review_count integer not null default 0,
  add column if not exists is_deal boolean not null default false,
  add column if not exists is_bestseller boolean not null default false,
  add column if not exists is_new_release boolean not null default false,
  add column if not exists is_editor_pick boolean not null default false,
  add column if not exists is_plus boolean not null default false,
  add column if not exists is_sample boolean not null default false,
  add column if not exists has_audio boolean not null default false,
  add column if not exists has_reader_content boolean not null default false,
  add column if not exists published_at date,
  add column if not exists popularity real not null default 0,
  add column if not exists search_text text not null default '',
  add column if not exists search tsvector generated always as (to_tsvector('simple', search_text)) stored;
create index if not exists bookatlas_books_search_idx on public.bookatlas_books using gin (search);
create index if not exists bookatlas_books_genres_idx on public.bookatlas_books using gin (genres);
-- One index per sort, carrying the categories: a category page is an index-only scan.
create index if not exists bookatlas_books_featured_idx on public.bookatlas_books (is_editor_pick desc, popularity desc, id) include (genres);
create index if not exists bookatlas_books_bestseller_idx on public.bookatlas_books (is_bestseller desc, popularity desc, id) include (genres);
create index if not exists bookatlas_books_rating_idx on public.bookatlas_books (rating desc, popularity desc, id) include (genres);
create index if not exists bookatlas_books_price_idx on public.bookatlas_books (price, popularity desc, id) include (genres);
create index if not exists bookatlas_books_newest_idx on public.bookatlas_books (published_at desc nulls last, popularity desc, id) include (genres);
create index if not exists bookatlas_books_format_idx on public.bookatlas_books (format, popularity desc);
create index if not exists bookatlas_books_language_idx on public.bookatlas_books (language, popularity desc);
create index if not exists bookatlas_books_plus_idx on public.bookatlas_books (popularity desc) where is_plus;
create index if not exists bookatlas_books_audio_idx on public.bookatlas_books (popularity desc) where has_audio;

-- Category, language and format counts, refreshed after catalogue writes (at most once a minute).
create materialized view if not exists public.bookatlas_catalog_facets as
  select 'category'::text as kind, g as name, count(*)::bigint as n from public.bookatlas_books, unnest(genres) as g group by g
  union all select 'language', language, count(*) from public.bookatlas_books where language is not null group by language
  union all select 'format', format, count(*) from public.bookatlas_books where format is not null group by format
  union all select 'total', 'all', count(*) from public.bookatlas_books;
create unique index if not exists bookatlas_catalog_facets_key on public.bookatlas_catalog_facets (kind, name);
create or replace function public.bookatlas_catalog_facets() returns table (kind text, name text, n bigint)
  language sql stable security definer set search_path = public
  as $$ select kind, name, n from public.bookatlas_catalog_facets $$;
create or replace function public.bookatlas_refresh_catalog_facets() returns void
  language sql security definer set search_path = public
  as $$ refresh materialized view concurrently public.bookatlas_catalog_facets $$;
revoke all on public.bookatlas_catalog_facets from anon, authenticated;
revoke all on function public.bookatlas_catalog_facets() from public, anon, authenticated;
revoke all on function public.bookatlas_refresh_catalog_facets() from public, anon, authenticated;
grant select on public.bookatlas_catalog_facets to service_role;
grant execute on function public.bookatlas_catalog_facets() to service_role;
grant execute on function public.bookatlas_refresh_catalog_facets() to service_role;

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

-- eBook purchases (TASK-0004): one row per book per Stripe Checkout session. Kept as the
-- order record (Dutch fiscal retention: 7 years); a full refund sets status 'refunded'.
create table if not exists public.bookatlas_purchases (
  id uuid primary key,
  user_id text not null,
  book_id text not null,
  checkout_session_id text not null,
  payment_intent_id text,
  amount_total integer not null,
  currency text not null,
  status text not null default 'paid' check (status in ('paid','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checkout_session_id, book_id)
);
create index if not exists bookatlas_purchases_user_idx on public.bookatlas_purchases (user_id, status);
create index if not exists bookatlas_purchases_intent_idx on public.bookatlas_purchases (payment_intent_id);

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
  -- When the buyer expressly asked for immediate access and acknowledged losing the 14-day right of
  -- withdrawal (Directive 2011/83/EU art. 16(m)); null means the withdrawal right still applies.
  withdrawal_waiver_at timestamptz,
  -- Buyer refund requests (14 days after purchase), decided by an administrator.
  refund_requested_at timestamptz,
  refund_reason text check (char_length(refund_reason) <= 1000),
  refund_decision text check (refund_decision in ('approved','declined')),
  refund_decided_at timestamptz,
  refund_decided_by text,
  check (amount_gross = amount_net + amount_vat)
);
create index if not exists bookatlas_invoices_user_idx on public.bookatlas_invoices (user_id, seq desc);
create index if not exists bookatlas_invoices_intent_idx on public.bookatlas_invoices (payment_intent_id);
create index if not exists bookatlas_invoices_issued_idx on public.bookatlas_invoices (issued_at);
create index if not exists bookatlas_invoices_refund_idx on public.bookatlas_invoices (refund_requested_at) where refund_requested_at is not null;

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
alter table public.bookatlas_purchases enable row level security;
alter table public.bookatlas_invoices enable row level security;
revoke all on table public.bookatlas_books, public.bookatlas_categories,
  public.bookatlas_registered_users, public.bookatlas_subscribers, public.bookatlas_campaigns,
  public.bookatlas_publishing_jobs, public.bookatlas_publishing_messages,
  public.bookatlas_publishing_test_books, public.bookatlas_ebook_submissions,
  public.bookatlas_prep_feedback, public.bookatlas_purchases, public.bookatlas_invoices from anon, authenticated;
grant select, insert, update, delete on table public.bookatlas_books, public.bookatlas_categories,
  public.bookatlas_registered_users, public.bookatlas_subscribers, public.bookatlas_campaigns,
  public.bookatlas_publishing_jobs, public.bookatlas_publishing_messages,
  public.bookatlas_publishing_test_books, public.bookatlas_ebook_submissions,
  public.bookatlas_prep_feedback, public.bookatlas_purchases, public.bookatlas_invoices to service_role;
commit;
