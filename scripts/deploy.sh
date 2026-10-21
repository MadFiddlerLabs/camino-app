#!/usr/bin/env bash
# Deterministic web deploy for a given EAS environment.
#
# Why this script exists: EXPO_PUBLIC_* values (e.g. the Supabase URL/key) are baked
# into the client bundle by Metro at `expo export` time -- and Metro's cache does NOT
# bust when only env values change. Deploying staging vs production with different
# databases therefore requires: pull that environment's vars, CLEAR the Metro cache,
# export, then deploy. Skipping the cache clear silently ships the wrong database.
#
# Usage:
#   ./scripts/deploy.sh staging                 # -> preview env, alias camino--staging (retired)
#   ./scripts/deploy.sh production cloudflare   # -> production on Cloudflare Workers (getcamino.app)
#   ./scripts/deploy.sh production [eas]         # -> production env on EAS Hosting (camino.expo.app)
#
# Hosting: getcamino.app is a Cloudflare Workers custom domain since 2026-10-21 (Expo Starter
# ends 2026-11-01; the free plan has no custom domains). The cloudflare host builds the same
# export, splits it with scripts/build-cloudflare.mjs, and uploads the server secrets from the
# pulled EAS environment with the Worker version (scripts/cloudflare-secrets.mjs; names only).
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-}"
HOST="${2:-eas}"
case "$HOST" in
  eas|cloudflare) ;;
  *) echo "usage: $0 {staging|production} [eas|cloudflare]"; exit 1 ;;
esac
if [ "$HOST" = cloudflare ] && [ "$TARGET" != production ]; then
  echo "[deploy] Cloudflare hosts production only (staging is retired)."; exit 1
fi
case "$TARGET" in
  staging)    EAS_ENV=preview;    DEPLOY_FLAGS=(--environment preview --alias staging) ;;
  production) EAS_ENV=production; DEPLOY_FLAGS=(--prod --environment production) ;;
  *) echo "usage: $0 {staging|production}"; exit 1 ;;
esac

echo "[deploy] Pulling '${EAS_ENV}' env vars into .env.local (EXPO_PUBLIC_ + secrets)..."
npx eas-cli env:pull "${EAS_ENV}" --path .env.local --non-interactive

# Load the pulled values into the actual shell environment. Metro inlines EXPO_PUBLIC_* from
# process.env with the HIGHEST priority — above every .env file — so this guarantees the target
# environment's values win over the local dev .env (which holds staging), instead of relying on
# .env-file precedence or a clean Metro cache. Without this, a plain `expo export` could bake the
# wrong database (observed: prod deployed with the staging Supabase after a back-to-back deploy).
#
# Export ONLY the vars this script needs in the shell: every EXPO_PUBLIC_* (Metro export) plus
# SUPABASE_SERVICE_ROLE_KEY (the staging authed-E2E seed). Do NOT `source` the whole pulled file —
# it breaks bash on multi-line/JSON secret values (GOOGLE_PLAY_INTEGRITY_SA_KEY is pretty-printed
# JSON spanning several lines; `source` tried to run a JSON line as a command → exit 127,
# 2026-07-30). The remaining server secrets are injected into the deployment by `eas deploy`
# directly from the EAS environment, not from this shell, so leaving them out here is a no-op at
# runtime. These allowlisted values are single-line and shell-safe, so eval is fine.
set -a
eval "$(grep -E '^(EXPO_PUBLIC_[A-Za-z0-9_]+|SUPABASE_SERVICE_ROLE_KEY)=' .env.local)"
set +a

echo "[deploy] Baking: EXPO_PUBLIC_ENV=${EXPO_PUBLIC_ENV:-<unset>}  SUPABASE=${EXPO_PUBLIC_SUPABASE_URL:-<unset>}"

echo "[deploy] Catalog audit (invariant 2: interview <-> catalog contract)..."
npm run --silent audit

echo "[deploy] Engine test suite (deterministic, offline)..."
npm run --silent test

echo "[deploy] Exporting web bundle with fully cleared caches (critical -- see header)..."
rm -rf dist node_modules/.cache
npx expo export --platform web --clear

# This project lives on an iCloud-synced Desktop: iCloud can drop " 2"/" 3" conflict-copy
# directories INSIDE dist mid-export, and a deploy that uploads them shipped stale content
# once (2026-07-03: prod-parity pages served an old bundle while the local dist was correct).
if find dist -maxdepth 1 -name "* [0-9]" | grep -q .; then
  echo "[deploy] Removing iCloud conflict-copy dirs from dist:"
  find dist -maxdepth 1 -name "* [0-9]" -print -exec rm -rf {} +
fi

echo "[deploy] Deploying to ${TARGET} on ${HOST} ..."
DEPLOY_LOG="$(mktemp)"
if [ "$HOST" = cloudflare ]; then
  node scripts/build-cloudflare.mjs
  SECRETS_FILE="$(mktemp)"
  trap 'rm -f "$SECRETS_FILE" .env.local' EXIT
  node scripts/cloudflare-secrets.mjs .env.local "$SECRETS_FILE"
  npx wrangler deploy --secrets-file "$SECRETS_FILE" 2>&1 | tee "$DEPLOY_LOG"
  rm -f "$SECRETS_FILE"
  # The workers.dev URL serves the version just deployed (no custom-domain cache in front).
  DEPLOY_URL="$(grep -oE 'https://[a-z0-9.-]+\.workers\.dev' "$DEPLOY_LOG" | head -1)"
else
  npx eas-cli deploy "${DEPLOY_FLAGS[@]}" 2>&1 | tee "$DEPLOY_LOG"
  # The UNIQUE per-deploy URL (camino--<id>.expo.app) is always fresh — testing it avoids the
  # alias/custom-domain CDN lag, so E2E checks exactly the bundle we just shipped.
  DEPLOY_URL="$(grep -oE 'https://camino--[a-z0-9]+\.expo\.app' "$DEPLOY_LOG" | head -1)"
fi
rm -f "$DEPLOY_LOG"

# Web E2E as a post-deploy regression gate (set DEPLOY_SKIP_E2E=1 to skip). Runs against the
# unique URL. Staging: the full suite (public smoke + authed — SUPABASE_SERVICE_ROLE_KEY is in
# the sourced env, and seed.mjs targets the staging DB / refuses prod) + the API contract tests
# (validation paths only; one CDN-cacheable TTS GET). Production: PUBLIC smoke ONLY — the authed
# suite seeds a test user, which must never touch the prod DB. `set -e` makes a failure exit
# non-zero (loud): on staging that's your "don't promote to prod" signal.
if [ -n "${DEPLOY_SKIP_E2E:-}" ]; then
  echo "[deploy] ⚠️  Web E2E SKIPPED by DEPLOY_SKIP_E2E=1."
elif [ -z "$DEPLOY_URL" ]; then
  # A gate that silently doesn't run isn't a gate (2026-07-05 testing audit).
  echo "[deploy] ❌ No deploy URL captured from the ${HOST} deploy output — the E2E gate cannot run."
  echo "[deploy]    The deploy itself may have succeeded; verify, fix the URL capture, or rerun"
  echo "[deploy]    with DEPLOY_SKIP_E2E=1 to accept an ungated deploy deliberately."
  exit 1
else
  echo "[deploy] Web E2E against ${DEPLOY_URL} ..."
  if [ "$TARGET" = "production" ]; then
    # E2E_TURNSTILE_LIVE=1: production runs the REAL Cloudflare Turnstile, which an automated
    # browser can't solve — the live interview-turn smoke stops after the page/intro load (the
    # gated round-trip is covered on staging with test keys + a manual human check on prod). C2b.
    E2E_TURNSTILE_LIVE=1 E2E_BASE_URL="$DEPLOY_URL" npx playwright test --project=public
  else
    E2E_BASE_URL="$DEPLOY_URL" npx playwright test
    echo "[deploy] API contract tests against ${DEPLOY_URL} ..."
    API_BASE="$DEPLOY_URL" npm run --silent test:api
  fi
  echo "[deploy] Web E2E passed."
fi

echo "[deploy] Cleaning up .env.local (leaves your local dev .env untouched)..."
rm -f .env.local

echo "[deploy] Done: ${TARGET}."
