/**
 * Auth setup for the authed web suite: seeds/resets the local-Supabase E2E user (scripts/e2e/seed.mjs),
 * exchanges the minted magic-link token for a session (no email involved), plants it in
 * localStorage the way supabase-js stores it, confirms the app actually recognizes the session
 * (the fixture roadmap renders), and saves Playwright storageState for the authed project.
 *
 * Skips cleanly when no service or anon key is in the env — public smoke tests stay runnable anywhere.
 */
import { test as setup, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { STATE_PATH } from './authState';

const SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL
  ?? 'http://127.0.0.1:54321'; // local Supabase (`npx supabase start`), never production
// The anon/publishable key is public by design; `npx supabase status` prints the local one.
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

setup('seed the E2E user and capture a signed-in session', async ({ page }) => {
  setup.skip(!SERVICE_KEY || !ANON_KEY, 'no service/anon key in env — authed suite skipped');

  // 1. Seed/reset the user + mint a token (service role, local-only guard inside the script).
  const out = execFileSync('node', ['scripts/e2e/seed.mjs'], {
    env: { ...process.env, E2E_SUPABASE_URL: SUPABASE_URL, E2E_SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY },
    encoding: 'utf8',
  });
  const seed = JSON.parse(out.trim().split('\n').pop()!) as { hashed_token: string };
  expect(seed.hashed_token).toBeTruthy();

  // 2. Token → session, via the normal anon client (the same exchange the magic-link email does).
  const anon = createClient(SUPABASE_URL, ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: seed.hashed_token });
  expect(error, `verifyOtp failed: ${error?.message}`).toBeNull();
  const session = data.session!;

  // 3. Plant the session exactly where supabase-js looks for it on web, then prove the app
  //    accepts it by loading the saved roadmap (fixture guarantees NIE is in the plan).
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
  await page.goto('/');
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [`sb-${ref}-auth-token`, JSON.stringify(session)] as const,
  );
  await page.goto('/plan');
  await expect(page.getByText('Your roadmap', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Obtain your NIE/).first()).toBeVisible({ timeout: 20_000 });

  await page.context().storageState({ path: STATE_PATH });
});
