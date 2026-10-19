-- public.profiles: one row per signed-in user, holding their interview answers.
--
-- RECONSTRUCTED 2026-10-19 for local dev. The original DDL was never in git: it lived in the
-- managed Supabase dashboards (deleted 2026-10-19) and was carried to the self-hosted box by a
-- pg_dump. Columns match the box (id, user_id, answers, created_at, updated_at, is_staff); types,
-- defaults and constraints are inferred from core/profileDb.ts and docs/STAFF.md. Replace this
-- file with a schema-only dump of the box when one is taken:
--   docker exec supabase-db pg_dump -U postgres --schema-only --schema=public

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade, -- upsert onConflict
  answers jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_staff boolean not null default false -- server-owned; see docs/STAFF.md
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile" on public.profiles
  for select using (auth.uid() = user_id);
create policy "Users can upsert their own profile" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = user_id);

-- Column grants: see scripts/sql/profiles-grants.sql (user_id MUST be in the UPDATE grant;
-- is_staff must NOT be).
revoke insert, update on public.profiles from authenticated;
grant  insert (user_id, answers, updated_at) on public.profiles to authenticated;
grant  update (user_id, answers, updated_at) on public.profiles to authenticated;
