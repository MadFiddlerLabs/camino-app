# Camino — deployment runbook

Target: a **dev / staging / production** pipeline. The web app and its API routes run on
**Cloudflare Workers** (EAS Hosting until 2026-10-21); iOS/Android build and update via **EAS**. The Anthropic key is server-side only
(`app/api/lola+api.ts`), never shipped to the client.

## Prerequisites (one-time)

1. **Create a free Expo account** → https://expo.dev (needed for hosting + builds).
2. Install the CLI: `npm i -g eas-cli` (or use `npx eas-cli …`).
3. `eas login`
4. `eas init` — links this repo to an EAS project (writes the project ID into `app.config.ts`
   / `extra.eas.projectId`). Commit that change.

## Environment variables

Local dev (`.env`, gitignored) — already set up:
- `ANTHROPIC_API_KEY` — **server-side** key read by `app/api/lola+api.ts`. (Added as a copy of
  the old `EXPO_PUBLIC_ANTHROPIC_API_KEY`; the `EXPO_PUBLIC_` one is no longer used and can be
  deleted.)
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — safe to be public (RLS).

On EAS, set the secret **per environment** (never commit it):
```
eas env:create --name ANTHROPIC_API_KEY --value <key> --environment production --visibility secret
eas env:create --name ANTHROPIC_API_KEY --value <key> --environment preview   --visibility secret
# (repeat the two EXPO_PUBLIC_SUPABASE_* as plain env vars per environment)
```

## Phase 1 — Web

`app.config.ts` sets `web.output: 'server'`, so `expo export --platform web` produces static pages
(`dist/client`, pre-rendered HTML in `dist/server`) plus the API routes (`dist/server/_expo/functions`).

**Host: Cloudflare Workers since 2026-10-21** (Worker `getcamino`, MadFiddlerLabs account, custom
domain getcamino.app, test URL https://getcamino.camino-app.workers.dev). Expo's Starter plan ends
2026-11-01 and the free plan has no custom domains. How it fits together:
- `scripts/build-cloudflare.mjs` splits the export: every pre-rendered page and static file becomes a
  Workers static asset (served without running code); the worker (`cloudflare/worker.mjs`, Expo's
  `expo-server/adapter/workerd`) gets only the routes manifest, the API functions, the dynamic-route
  templates and the 404 page. Keeps the worker small enough for the free plan.
- `scripts/cloudflare-secrets.mjs` turns the pulled EAS environment into the Worker's secrets, so
  **EAS stays the one place secrets are stored**: rotate in EAS, then deploy.
- `wrangler.jsonc` holds the rest (account, `nodejs_compat`, assets, the custom domain).
- Wrangler uses Andrew's OAuth login (`npx wrangler whoami`).

Free-plan limits: 10 ms CPU per request and 100K worker requests a day (static assets don't count).
Measured 2026-10-21: every route ≤ 4 ms CPU (waiting on Anthropic/Supabase doesn't count).

### Use the deploy scripts (don't run export/deploy by hand)

```
npm run deploy:staging      # RETIRED 2026-10-08 — staging DB is gone (see Environments below)
npm run deploy:production    # -> production env + prod DB, Cloudflare Worker -> getcamino.app
npm run deploy:eas           # -> the same build on EAS Hosting (camino.expo.app only; fallback)
```

⚠️ **Why:** `EXPO_PUBLIC_*` values (Supabase URL/key, `EXPO_PUBLIC_ENV`) are inlined into the
client bundle by Metro at `expo export` time. Two traps: (1) Metro's cache does not bust when only
env values change, and (2) the local dev `.env` (which holds **local Supabase**) can win over the pulled
target-env values. The script defends against both: `eas env:pull` the target environment →
**`source` those vars into the shell** (Metro reads `process.env` at the highest priority, above
every `.env` file) → clear `dist` + `node_modules/.cache` → `export --clear` → deploy → remove
`.env.local`. It prints `[deploy] Baking: EXPO_PUBLIC_ENV=… SUPABASE=…` — **eyeball that line**.

> 🐞 Real incident (2026-07-01): running `deploy:staging` then `deploy:production` back-to-back
> baked the **staging** Supabase into the production bundle (prod briefly pointed at the staging
> DB). Fixed by sourcing the pulled env into the shell. Always verify the baked ref after deploy:
> `curl -s https://getcamino.app/interview | grep -oE '/_expo/static/js/web/[^"]+\.js'` then grep
> the bundle for the Supabase host (`supabase.getcamino.app` = prod; `127.0.0.1:54321` = a local
> dev value leaked in).

### Environments / databases

| Env | URL | Supabase project |
|---|---|---|
| production | getcamino.app (Cloudflare Worker) | self-hosted `supabase.getcamino.app` since 2026-09-07 (real data). **No rollback target:** the managed projects were deleted 2026-10-19; recovery is the box's daily `pg_dumpall` backups |
| preview / staging | camino--staging.expo.app | **retired 2026-10-08**, no backend |
| local dev | `expo start` | local Supabase (`npx supabase start`, `http://127.0.0.1:54321`), schema from `supabase/migrations/` |

**Staging is retired (2026-10-08)** and its managed project was deleted on 2026-10-19, along with
the managed production project. Consequences: `deploy:staging` and the API contract tests have no deployed backend, and the
`e2e-ios.yml` workflow was deleted on 2026-10-19 (its seed step needed staging). Production deploys are unaffected: `deploy:production`
runs only the public E2E suite against its own deploy URL. Never point local dev or the E2E seed
at production. The seed (`scripts/e2e/seed.mjs`) refuses any host but `127.0.0.1` / `localhost`.

### Local dev backend (local Supabase)

Needs Docker (on the Mac Mini: `colima start`). Then:

```
npx supabase start     # first run pulls images; applies supabase/migrations/
npx supabase status    # URLs + local keys (API 54321, Studio 54323, Mailpit 54324)
npx supabase stop      # data persists; `npx supabase db reset` wipes and re-applies migrations
```

`.env` holds the local `EXPO_PUBLIC_SUPABASE_URL` and anon key from `npx supabase status`.
Email sign-in works (8-digit code, mail lands in Mailpit); Google and Apple sign-in are not
configured locally. `supabase/migrations/20261019000000_profiles.sql` comes from a schema-only
dump of the production box (2026-10-19), so local and production tables match.

### Live URLs

- **Production:** https://getcamino.app (Cloudflare Worker custom domain). www.getcamino.app
  redirects to it (Cloudflare Redirect Rule). DNS is a Cloudflare zone in the MadFiddlerLabs account
  since 2026-10-21; Namecheap stays the registrar.
- camino.expo.app still exists on Expo's free plan but is no longer deployed to.

## Phase 2 — Mobile (iOS / Android)

Bundle IDs are set (`com.nerolabs.camino`). Build profiles live in `eas.json`
(development / preview / production, each on its own EAS Update channel + environment).

- Native fetch to the API route needs an absolute origin: set `EXPO_PUBLIC_API_URL` to the
  deployed web origin for the mobile environments (the client already respects it — see
  `lib/lola.ts`).
- Dev client: `eas build --profile development --platform ios` (and android).
- Store builds: `eas build --profile production --platform all`, then `eas submit`.
- OTA updates: `eas update --channel preview` / `--channel production`.
- Requires an **Apple Developer** account ($99/yr) and **Google Play** account ($25 once).

## CI/CD (later)

EAS Workflows (`.eas/workflows/*.yml`) can gate builds/deploys on PR merges to `main`.
