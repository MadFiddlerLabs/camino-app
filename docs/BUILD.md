# BUILD.md — release pipeline & the pre-ship gate

How Get Camino ships, and the checks that gate a release. (Historical scaffolding notes were
removed 2026-07-04 — the app is long since real; see HANDOFF.md for current state.)

## Surfaces & how each ships

- **Web** — `./scripts/deploy.sh {staging|production}` (pulls that env's vars, clears the Metro
  cache, exports, deploys to EAS Hosting). Verify a content marker ON THE UNIQUE DEPLOYMENT URL
  (the alias/custom domain lag on CDN edges). This is the day-to-day surface; deploy freely.
- **iOS** — `eas build --platform ios --profile production --auto-submit` → TestFlight. **Only
  on user command** (free-tier build credits). Batch native changes between builds.
- **Android** — same EAS build path; Google Play is a launch platform now (personal Play
  account → 12-tester/14-day closed test applies — start it early).

## Two tiers of checks (user decisions 2026-07-05)

- **Every web deploy** (the routine iteration loop): `scripts/deploy.sh` runs, in order, the
  fast deterministic checks (**typecheck via tsc is separate; audit · test** inline) → export →
  deploy → **the Playwright web E2E suite against the unique deployment URL**. Staging runs all
  12 (public smoke + authed) **plus the API contract tests** (validation paths + the Spanish
  extraction gate — promoted from opt-in by the 2026-07-05 testing audit); production runs the
  6 public smoke (the authed suite seeds a test user that must never touch the prod DB — and
  seed.mjs now ALLOWLISTS the staging project rather than denylisting prod). A failure exits
  non-zero — on staging, that's the "don't promote to prod" signal; a deploy whose unique URL
  can't be captured now FAILS instead of silently skipping the gate. `DEPLOY_SKIP_E2E=1` to
  skip deliberately. **Web regressions are caught at the deploy, automatically, on exactly the
  bundle that shipped.**
- **Big builds only** (a native EAS build for TestFlight/Play, i.e. an App Store candidate):
  ALSO run the Maestro flows locally (the `e2e-ios` CI workflow was deleted 2026-10-19 with
  staging): `maestro test .maestro --exclude-tags=authed -e APP_ID=com.nerolabs.camino` against a simulator build (`eas build --platform ios --profile e2e-test --local`). It's a deliberate **release gate, not an iteration gate**.

## The pre-ship gate (all green before a big build / store submission)

1. **`npm run typecheck`** — tsc strict. *(also every push)*
2. **`npm run audit`** — catalog ↔ interview contract (invariant 2) + all personas. Runs in
   deploy.sh and CI on every push.
3. **`npm test`** — deterministic engine + email-digest + report + this-week + date + digit-lint
   suites (vitest). Deploy gate + CI.
4. **`npm run test:e2e`** — Playwright, 12 tests vs deployed staging: the public smoke suite +
   the **authed** suite (sign in → saved roadmap → This-week → mark-done → no-op re-model →
   sign-out). Needs `E2E_SUPABASE_SERVICE_ROLE_KEY` in env (skips cleanly without it). Manual +
   pre-release (each run spends a few live LLM calls; our own rate limits apply to us too).
5. **Maestro, locally** (**big builds only**) — the **3 deterministic native flows**: launch/home,
   sample plan, interview (a real LLM turn), on an iOS simulator: `maestro test .maestro --exclude-tags=authed -e APP_ID=com.nerolabs.camino` against a simulator build (`eas build --platform ios --profile e2e-test --local`).
   The `e2e-ios` GitHub workflow that ran these on CI was deleted 2026-10-19: its seed step needed
   the retired staging backend.

### Why the native authed flow is NOT in the gate

The `04-authed-roadmap` Maestro flow (deep-link sign-in) is tagged `authed` and
**`--exclude-tags=authed`** in CI. Opening iOS deep links via Maestro on CI runners is a
documented, unresolved flake — the "Open in app" SpringBoard alert isn't in the app's
accessibility tree on Maestro 2.x / iOS 18.x, so it can't be tapped
([Maestro #2610](https://github.com/mobile-dev-inc/Maestro/issues/2610); confirmed in our runs
2–4). We don't gate on a known tool bug. That journey is fully covered by the authed **Playwright
web** suite (identical React components) and by **manual on-device sign-in** every build. The
flow stays in `.maestro/` — runnable locally on a Maestro version where the dialog pattern works;
re-fold into CI when #2610 is fixed or when we pin a known-good Maestro version.

Re-checked 2026-07-05 (testing audit): #2610 is closed as "waiting for customer response" — NOT
fixed. Deep links reportedly work on ≤1.39.13, but pinning that old a CLI would risk the three
green flows on the Xcode 26 image. Instead the workflow now pins **Maestro 2.6.1** (the version
green run #7 used) so runs are reproducible; the exclusion stands.

## Release checklist (per store submission)

- [ ] Gate green: typecheck · audit · test · test:e2e (12, auto on deploy) · Maestro (3 native, local).
- [ ] Target build device-verified by the user (TestFlight / Play internal) — mic, voice,
      dictation, deep-link sign-in, the current fix list.
- [ ] Store metadata / screenshots / privacy answers current (docs/APP_STORE.md).
- [ ] iOS: DSA trader status + privacy-policy URL in ASC.
- [ ] Android: closed-test 14-day window cleared.

## Growing E2E coverage (standing practice — user directive 2026-07-05)

Every time a bug reaches a person, ask: "what test would have caught this, and where?" Add it
to the suite that owns that surface (Playwright `tests-e2e/` for web logic; `.maestro/` for
native shell/rendering), so the same regression can't recur as we iterate. The suites are meant
to GROW. Candidate tests to add as areas of concern surface (living list):

- **Interview extraction** — a few high-value answers → expected slot values end-to-end
  ("we're a married couple, no kids" → spouse+married+no-children autofill); multi-answer skip;
  the conversational clarify path.
- **Living plan** — mark-done re-flow re-dates a downstream step (not just toggles); a REAL
  re-model that changes the plan (add "we had a baby" → school step appears) vs the no-op gate.
- **Region-aware** — pick a comunidad → the regional note names it on the roadmap + guide + PDF.
- **This-week honesty** — overdue vs due-soon vs clear-week states render correctly for a fixture.
- **Email loop** — welcome fires once (not 3×); weekly digest caps at a handful; unsubscribe.
- **Guardrails** — /api/lola & /api/tts payload caps (413), strict CORS preflight, rate-limit 429.
- **A11y** — focus ring visible on tab; every interactive control has an accessible name.
- **Localization (once L1 ships)** — home + interview render in `es`; the digit/brand lints.
- **Native (Maestro, big builds)** — deep-link sign-in once #2610 is unblocked; PDF export; TTS.

## Resources / costs

| Resource | For | Cost |
|---|---|---|
| Apple Developer Program | iOS + TestFlight | $99/year |
| Google Play Developer | Android store | $25 one-time (personal account → 12-tester rule) |
| EAS | Cloud builds, hosting | Free tier + paid domain plan (in use) |
| Supabase · Anthropic · ElevenLabs · Resend · PostHog · Sentry | Backend / AI / email / analytics / errors | Free tiers + usage; provider spend caps set |

CI-secret setup for the E2E workflows: `EXPO_TOKEN`, `E2E_SUPABASE_URL`,
`E2E_SUPABASE_SERVICE_ROLE_KEY` (staging) as GitHub repo secrets.
