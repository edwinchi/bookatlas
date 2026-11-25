-- Reading Intelligence phase 4 (2026-11-25): due dates on a class reading list, class quizzes made from a chapter,
-- and each member's quiz scores. Run once in the Supabase SQL editor, after
-- migrations-2026-11-25-reading-classes.sql; safe to run again.
begin;

alter table public.bookatlas_reading_classes
  add column if not exists due_dates jsonb not null default '{}'::jsonb,
  add column if not exists quizzes jsonb not null default '[]'::jsonb;
alter table public.bookatlas_reading_class_members
  add column if not exists quiz_scores jsonb not null default '{}'::jsonb;

commit;
