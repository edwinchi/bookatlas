-- Bookatlas Supabase schema.
-- Run this once in the Supabase SQL Editor for a new project before setting
-- SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env. All access from the app
-- goes through the service role key from server.ts (never from the browser),
-- so these tables can keep RLS disabled — the service role bypasses it anyway.

create table if not exists books (
  id text primary key,
  title text not null,
  author text not null,
  primary_genre text,
  price numeric,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists books_primary_genre_idx on books (primary_genre);

create table if not exists categories (
  name text primary key,
  created_at timestamptz not null default now()
);

create table if not exists registered_users (
  email text primary key,
  name text,
  registered_at bigint not null,
  last_active bigint not null,
  reading_streak integer not null default 0,
  books_read integer not null default 0
);

create table if not exists subscribers (
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
create index if not exists subscribers_status_idx on subscribers (status);

create table if not exists campaigns (
  id text primary key,
  sent_at bigint not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
