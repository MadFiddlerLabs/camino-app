# Monitoring (Sentry)

Error + performance monitoring runs through **one Sentry project** — `getcamino` in org `madfiddlerlabs` (moved from `camino-ko/camino` 2026-10-19)
(DE region) — with everything tagged by `platform` (web / ios / android / server) and
`environment` (production / staging), so a single Issues/Performance view covers all surfaces and
you filter by tag.

## Config

- **DSN** (public, safe to embed): set as `EXPO_PUBLIC_SENTRY_DSN` in the EAS **preview** +
  **production** environments (baked into the web bundle at export, like the PostHog key). Not set
  locally, so `expo start` reports nothing.
- The DSN lives in Sentry → Settings → Project `camino` → Client Keys (DSN).
- **`SENTRY_AUTH_TOKEN`** (secret, user-set) in the EAS build env lets EAS Build upload native
  source maps, so iOS stack traces are readable rather than minified.

## What's captured (refreshed 2026-07-12)

| Surface | Module | What |
|---|---|---|
| **Web** | `lib/monitoring.ts` (`@sentry/browser`) | JS errors + `browserTracing` (page-load / navigation transactions + Web Vitals: LCP/CLS/INP = "time to load"). `tracesSampleRate` 0.2 prod / 1.0 staging. |
| **Backend** | `lib/sentryServer.ts` | Minimal event envelope via `fetch` (the Node/Cloudflare SDKs don't fit the EAS Hosting Workers runtime). Wired into the catch + upstream-error paths of `/api/lola`, `/api/feedback`, and the email/account routes, tagged `platform=server`. **Budget-drain alert (C2c, 2026-07-13):** `volumeGuard` fires a server error `"/api/<route> global daily budget exhausted"` (tag `kind=global-budget-429`) the moment the GLOBAL daily budget trips on lola OR feedback — windowed to the first 3 over-limit requests so a sustained attack can't storm Sentry (`shouldAlertBudgetDrain`). Per-IP 429s stay silent (one abuser hitting their own cap ≠ everyone locked out). |
| **Native** | `lib/monitoring.native.ts` (`@sentry/react-native` + its Expo plugin in `app.config.ts`) | Real `Sentry.init` since build 8 (2026-07-02): crashes, errors, app-start, tagged `platform=ios` + environment. Source maps upload during EAS Build via `SENTRY_AUTH_TOKEN`. |

`initMonitoring()` is called once in `app/_layout.tsx`. `captureError()` is available for manual
client captures. Both no-op when there's no DSN.

## Alerting / uptime (live)

- **Issue alerts** (per-surface since 2026-07-12): "high priority issues" (the original
  catch-all, all surfaces) + "Native iOS — new production issue" (`platform=ios`) +
  "Server — new production issue" (`platform=server`) — both new-issue triggers,
  production environment only, notify → email. Add a `platform=android` twin when the
  Android build ships.
- **Uptime monitor** on `https://getcamino.app` — GET every 1 min, environment=production,
  3 consecutive fails → issue → email. Downtime pages laptop-independently.
- The **slow-turn alarm** (interview turns slower than they should be) rides the same project
  (added with the family-testing rounds).
- The **budget-drain alert** (C2c) rides the existing "Server — new production issue" rule:
  the first drain of a day creates a new server issue → email. NOTE: repeated drains on later
  days group into the SAME issue (same message), so if we want a page on EVERY incident (not
  just the first), add a Sentry rule that alerts on issue *recurrence/frequency* for
  `kind=global-budget-429`, or bump the event level. Deferred — at 25k/day for lola with no
  active abuse, the first-occurrence alert is what matters.
- Optional later: backend latency tracing (transaction envelopes), not just error capture.

## Verifying

Load a deployed URL and trigger an error; it should POST to
`https://o4512131087269888.ingest.de.sentry.io/api/4511666670469200/envelope/` (the org's ingest host; before
2026-10-19 it was `o4511666388598784`) (HTTP 200) and
appear in Issues within seconds, tagged with its environment + platform. (Web verified on
staging 2026-07-02; native verified on device from build 8.)
