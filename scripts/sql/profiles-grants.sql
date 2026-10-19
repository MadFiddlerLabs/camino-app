-- profiles-grants.sql — the CORRECT client grants for public.profiles, and how to verify them.
-- Run on the self-hosted production box (supabase.getcamino.app); local dev applies the same
-- grants in supabase/migrations/20261019000000_profiles.sql.
--
-- Background (2026-07-05 incident): docs/STAFF.md step-2 hardening revoked table-level
-- INSERT/UPDATE from `authenticated` and re-granted at the column level, but the UPDATE grant
-- OMITTED user_id. The app saves via a PostgREST upsert, and PostgREST expands merge-duplicates
-- to `INSERT … ON CONFLICT (user_id) DO UPDATE SET <every payload column>` — INCLUDING the
-- conflict key user_id. Without UPDATE(user_id), every signed-in save failed with
-- `42501 permission denied for table profiles` — and the client swallowed the error
-- (core/profileDb.ts, now fixed to alert Sentry). Result: signed-in roadmaps silently didn't
-- persist for days. Only pre-hardening Google profiles survived.
--
-- Safety: user_id in the UPDATE grant is safe — the RLS UPDATE policy `auth.uid() = user_id`
-- forbids reassigning a row to another user, and is_staff is deliberately NOT granted, so a
-- client still cannot elevate itself.

-- ── The grants ──────────────────────────────────────────────────────────────────────────────
revoke insert, update on public.profiles from authenticated;
grant  insert (user_id, answers, updated_at) on public.profiles to authenticated;
grant  update (user_id, answers, updated_at) on public.profiles to authenticated;  -- user_id REQUIRED
-- SELECT stays intact (client reads its own row, incl. is_staff, under RLS).

-- ── RLS policies (should already exist; create if missing) ──────────────────────────────────
--   "Users can read their own profile"   SELECT  using (auth.uid() = user_id)
--   "Users can upsert their own profile"  INSERT  with check (auth.uid() = user_id)
--   "Users can update their own profile"  UPDATE  using (auth.uid() = user_id)

-- ── Verify (should return exactly these write grants for authenticated) ──────────────────────
-- select column_name, privilege_type
-- from information_schema.role_column_grants
-- where table_schema='public' and table_name='profiles'
--   and grantee='authenticated' and privilege_type in ('INSERT','UPDATE')
-- order by privilege_type, column_name;
-- Expect: INSERT(answers,updated_at,user_id) + UPDATE(answers,updated_at,user_id). NO is_staff.
--
-- End-to-end verification lives in a throwaway-user probe (create user → verifyOtp → upsert twice
-- → confirm persisted → confirm is_staff write is blocked → delete). Keep it out of the repo (it
-- needs the service-role key); it's how production+staging were confirmed fixed on 2026-07-05.
