// E2E test-identity seeder — LOCAL SUPABASE ONLY. Creates/resets the shared test user and mints a
// fresh magic sign-in link, printing JSON to stdout:
//   { email, user_id, action_link, hashed_token }
//
// Consumers:
//  - tests-e2e/auth.setup.ts (web): exchanges hashed_token for a session via verifyOtp, then
//    persists it as Playwright storageState.
//  - Maestro flow 04 (native, local; the e2e-ios CI workflow was deleted 2026-10-19): passes
//    action_link to Maestro, which opens it — riding the app's REAL caminoapp://auth-callback
//    deep-link session flow.
//
// Env: E2E_SUPABASE_URL + E2E_SUPABASE_SERVICE_ROLE_KEY (falls back to EXPO_PUBLIC_SUPABASE_URL /
// SUPABASE_SERVICE_ROLE_KEY). Hard-refuses production. Start the backend first: `npx supabase start`.

import { createClient } from '@supabase/supabase-js';

const URL_ = process.env.E2E_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.E2E_EMAIL ?? 'e2e@getcamino.app';
// Where the magic link lands after Supabase verifies it. Default: the local web app (web
// tests don't follow the link anyway); the iOS workflow overrides with caminoapp://auth-callback.
const REDIRECT_TO = process.env.E2E_REDIRECT_TO ?? 'http://localhost:8081';

if (!URL_ || !KEY) {
  console.error('seed: missing E2E_SUPABASE_URL / E2E_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
// The one rule that must never break: E2E never touches the production database.
// ALLOWLIST, not denylist (2026-07-05 testing audit): only a local Supabase may be seeded. A
// denylist of the prod host would silently pass any OTHER database (a typo'd URL, a future
// second backend). E2E_SEED_ALLOW_HOST extends it deliberately. (The managed staging project
// this used to allow was deleted 2026-10-19.)
const LOCAL_HOSTS = ['127.0.0.1', 'localhost'];
const host = new URL(URL_).hostname;
if (!LOCAL_HOSTS.includes(host) && !(process.env.E2E_SEED_ALLOW_HOST && host === process.env.E2E_SEED_ALLOW_HOST)) {
  console.error(`seed: REFUSING to seed a non-local Supabase (${URL_}).`);
  console.error(`seed: only ${LOCAL_HOSTS.join(' / ')} is allowed; set E2E_SEED_ALLOW_HOST to extend.`);
  process.exit(1);
}

// Deterministic fixture: US-only NLV couple, address + region known, citizenship track on.
// Mirrors persona fields (all validated against SLOTS by `npm run audit` on the personas) and
// guarantees stable assertions: NIE applies (non-EU), empadronamiento applies (address),
// regional flags render (madrid), plan has firm-ish dates (fixed arrival).
const FIXTURE_ANSWERS = {
  nationalities: ['US'],
  work_situation: 'passive_income',
  annual_income_eur_band: '€34k–€60k',
  has_spouse_or_partner: true,
  partner_is_married: true,
  has_children: false,
  intends_long_stay: true,
  arrival_date: '2026-10-15',
  has_spanish_address: true,
  owns_or_drives: true,
  owns_property_in_spain: false,
  knows_where_to_live: true,
  region: 'madrid',
  has_pets: false,
  foreign_assets_eur_band: '€50k–€200k',
  us_resident: true,
  previously_ex_spanish_colony_nationality: false,
  wants_citizenship: true,
};

const admin = createClient(URL_, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUser(email) {
  // listUsers is paginated; the test project is small, one page is plenty.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  return data.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

const nowIso = new Date().toISOString();
let user = await findUser(EMAIL);
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    email_confirm: true,
    // Pre-mark email bookkeeping so the E2E account never triggers welcome/weekly sends.
    user_metadata: { welcomed_at: nowIso, weekly_optout: true },
  });
  if (error) throw error;
  user = data.user;
} else {
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, welcomed_at: user.user_metadata?.welcomed_at ?? nowIso, weekly_optout: true },
  });
  if (error) throw error;
}

// Reset to the fixture every run — this IS the determinism: progress and any prior test
// mutations are wiped by overwriting `answers` wholesale.
{
  const { error } = await admin.from('profiles').upsert(
    { user_id: user.id, answers: FIXTURE_ANSWERS, updated_at: nowIso },
    { onConflict: 'user_id' },
  );
  if (error) throw error;
}

// Link #1 → the web suite (auth.setup.ts) verifies hashed_token itself into a session.
// ORDER MATTERS: generating a magic link INVALIDATES any previous one for the same user
// (Supabase). So mint the NATIVE deep link FIRST and resolve it to real session tokens
// immediately (below); then mint the WEB link LAST so its hashed_token is the one still valid
// when auth.setup.ts verifies it. Getting this backwards fails the web suite with
// "Email link is invalid or has expired" (caught by the post-deploy E2E gate, 2026-07-05).

// Native deep link → follow the verify URL server-side (redirect:manual) to get the exact
// caminoapp://auth-callback#access_token=… redirect Supabase would hand a browser, but WITHOUT
// Safari — so Maestro never faces the "Open in Get Camino?" SpringBoard dialog. Its tokens are
// a real, already-exchanged session, independent of any later magic-link token.
let deep_link = null;
{
  const { data: l2, error: e2 } = await admin.auth.admin.generateLink({
    type: 'magiclink', email: EMAIL, options: { redirectTo: REDIRECT_TO },
  });
  if (e2) throw e2;
  const verifyUrl = l2.properties?.action_link;
  if (verifyUrl) {
    const res = await fetch(verifyUrl, { redirect: 'manual' });
    const loc = res.headers.get('location');
    if (loc && loc.startsWith('caminoapp://')) deep_link = loc;
    else console.error(`seed: unexpected verify redirect (status ${res.status}): ${loc?.slice(0, 60)}`);
  }
}

// Web link LAST → its hashed_token is the currently-valid one for auth.setup.ts's verifyOtp.
const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: EMAIL,
  options: { redirectTo: REDIRECT_TO },
});
if (linkErr) throw linkErr;

console.log(JSON.stringify({
  email: EMAIL,
  user_id: user.id,
  action_link: link.properties?.action_link ?? null,
  hashed_token: link.properties?.hashed_token ?? null,
  deep_link,
}));
