-- public.profiles: one row per signed-in user, holding their interview answers.
--
-- Taken 2026-10-19 from a schema-only dump of the production box (self-hosted Supabase):
--   docker exec supabase-db pg_dump -U postgres --schema-only --schema=public --no-owner
-- The table, constraints, policies and grants below match production. Supabase's default
-- privileges grant everything on new tables to anon/authenticated; RLS plus the column grants
-- at the bottom are what actually protect the table.

create table public.profiles (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    answers jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    is_staff boolean default false not null -- server-owned; see docs/STAFF.md
);

alter table only public.profiles
    add constraint profiles_pkey primary key (id);
alter table only public.profiles
    add constraint profiles_user_id_key unique (user_id); -- upsert onConflict
alter table only public.profiles
    add constraint profiles_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.profiles enable row level security;

create policy "Users can read their own profile" on public.profiles
    for select using ((auth.uid() = user_id));
create policy "Users can update their own profile" on public.profiles
    for update using ((auth.uid() = user_id));
create policy "Users can upsert their own profile" on public.profiles
    for insert with check ((auth.uid() = user_id));

-- Column grants: see scripts/sql/profiles-grants.sql (user_id MUST be in the UPDATE grant;
-- is_staff must NOT be).
revoke insert, update on public.profiles from authenticated;
grant insert (user_id, answers, updated_at) on public.profiles to authenticated;
grant update (user_id, answers, updated_at) on public.profiles to authenticated;
