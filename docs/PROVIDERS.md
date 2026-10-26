# PROVIDERS.md — the SaaS accounts behind Get Camino

The complete list of third-party services the app depends on, who charges money,
and where each account's contact/billing email lives. Written 2026-07-12 from an
evidence-based audit (repo env vars, dependencies, workflows, and getcamino.app DNS —
not from memory). **All billing and notification email lands in `andrew@andrewedmond.com`.**
Since 2026-10-26 the getcamino.app addresses (andrew@, feedback@, lola@, privacy@, legal@,
support@) are aliases of that inbox, so mail sent to either address arrives in one place.
Account ownership is tracked in the MadFiddlerLabs vendor registry.

Keep this file honest: if a provider is added or dropped, update it in the same PR
(same discipline as the privacy page — the two lists should always agree).

## Paid — money moves (or can)

| Provider | Role | Billing shape | Contact/billing lives at |
|---|---|---|---|
| **Anthropic** | Claude API behind `/api/lola` (Lola's phrasing + extraction) | Per-token; Console spend cap is the hard backstop for `LOLA_GLOBAL_PER_DAY=25000` | console.anthropic.com → Settings → Organization/Billing |
| **Expo / EAS** | Native builds, store submits, OTA updates, env vars (the one store for server secrets). Web hosting moved to Cloudflare Workers 2026-10-21 | Free plan from 2026-11-01 (Starter cancelled 2026-10-21; Free has no custom domains). Builds only on user command | expo.dev → `madfiddlerlabs` account → Billing (renamed from `nerolabs-team` 2026-10-19) |
| **Apple Developer** | $99/yr program; App Store Connect | Annual | developer.apple.com → Membership. **⚠️ Do NOT change account contact while the Proxim.us → AELaboratories identity/trader case is open** |
| **Google Workspace** | Receives getcamino.app mail. Since 2026-10-26 getcamino.app is a secondary domain of the andrewedmond.com Workspace (the getcamino.app Workspace was deleted); andrew@, feedback@, lola@, privacy@, legal@ and support@getcamino.app are aliases of andrew@andrewedmond.com. No catch-all: e2e@getcamino.app does not receive. DNS: MX smtp.google.com, SPF `include:_spf.google.com`, DKIM selector `google` | Billed on the andrewedmond.com Workspace (MadFiddlerLabs) | admin.google.com as andrew@andrewedmond.com |
| **Namecheap** | Registrar for getcamino.app. DNS moved to Cloudflare 2026-10-21 (NS = alla/bryce.ns.cloudflare.com) | Annual renewal — **silent-failure risk if renewal notices go astray; domain expiry kills everything** | namecheap.com → Profile → contacts + WHOIS contacts + renewal alerts |
| **ElevenLabs** | ~~TTS voice~~ — plan cancelled 2026-07-12; code, `/api/tts`, and EAS env vars all removed | Final invoice may still arrive | Keep login reachable until the last invoice clears, then delete the account |
| **Google Play** | Android listing `com.aelaboratories.getcamino` (live since 2026-08-22) | $25 one-time, paid | Developer account AELaboratories, Inc (7162615225282353306). Owner andrew@andrewedmond.com since 2026-10-25 (was andrew@getcamino.app). Public developer email support@getcamino.app. `eas submit` uses the service account `eas-play-publisher@get-camino.iam.gserviceaccount.com` |

## Free tier today — could start charging as usage grows

| Provider | Role | Watch for |
|---|---|---|
| **Supabase (self-hosted)** | Auth + database for the **live app**, self-hosted at `supabase.getcamino.app` on an Oracle Cloud always-free ARM VM (Docker Compose, Caddy/Let's Encrypt) since **2026-09-07**. $0/mo, no inactivity pausing. See the [[supabase-selfhost-migration]] runbook | Oracle account upgraded to **Pay As You Go on 2026-10-08** (trial ended 2026-10-07). PAYG exempts the VM from Oracle's idle-instance reclamation; Always Free usage still bills $0, and the `camino-1usd-spend-alarm` budget emails on the first cent of spend. Keep the VM inside the Always Free limits (A1: 4 OCPU / 24 GB, 200 GB block storage). Now it's OURS to run: backups (`~/backup-supabase.sh` daily cron, pulled off-box daily to the maintainer's Mac), self-heal (`~/healthcheck.sh` 5-min cron), TLS auto-renew, and the box's own monitoring via `/api/status`. Ops eyes: the Sentry uptime monitor on `/api/status`. SSH `~/.ssh/oracle_camino` |
| **Supabase (managed, legacy)** | **DELETED 2026-10-19:** production (`oftrpaleqtmuvolwsocd`), staging (`gsnsgfobfswazqhfcstx`) and their org. There is no managed rollback target any more; recovery is the self-hosted box's backups. Both keepalive workflows are deleted | Nothing to watch. Local dev runs local Supabase instead (see DEPLOY.md) |
| **PostHog** | Product analytics (EU cloud, cookieless on web; dashboard 808581) | 1M events/mo free — launch spikes could cross it |
| **Sentry** | Error reporting (org `madfiddlerlabs`, project `getcamino`, EU ingest; moved from `camino-ko/camino` 2026-10-19) + 1-min uptime monitor + alert emails | **Alerts go to member emails** — route them to andrew@andrewedmond.com (the getcamino.app Workspace was merged away 2026-10-26) or incidents go unseen |
| **Resend** | All app email (welcome, weekly roundup, feedback relay) **and the self-hosted box's sign-in emails (SMTP)**. Team `MadFiddlerLabs` since 2026-10-19 (moved from an old personal account), region eu-west-1. DNS (Cloudflare zone since 2026-10-21): DKIM TXT `resend._domainkey`, CNAMEs `send` and `rsend` (→ `*.forge.rmta.net`). Receiving stays off: the apex MX belongs to Google Workspace. One sending-only key, "GetCamino prod", is used by both EAS `RESEND_API_KEY` and the box's `SMTP_PASS`: rotate both together | 3K emails/mo free tier; the weekly cron scales with users |
| **GitHub** | Repo (org `MadFiddlerLabs` since 2026-10-19, **public** → Actions free) | Org billing email anyway, in case a private repo appears |
| **Google Cloud** | (1) `camino-501016` (no organization): the OAuth client and consent screen behind Google sign-in; sole Owner andrew@andrewedmond.com. (2) `get-camino` (andrewedmond.com organization): the Play publisher and Play Integrity service accounts | The consent screen's **support email is public-facing**. It can only be the signed-in account or a Google Group it manages, so an alias such as support@getcamino.app can't be chosen. Support email and developer contact stay andrewnedmond@gmail.com (Andrew's choice, 2026-10-26) |
| **Cloudflare** | `MadFiddlerLabs` account. (1) Web hosting + API routes: Worker `getcamino` (Workers Free; custom domain getcamino.app; test URL getcamino.camino-app.workers.dev), deployed by `npm run deploy:production` since 2026-10-21. (2) DNS: zone getcamino.app (Free plan), every record DNS-only except www, which redirects to the apex with a Redirect Rule; Bot Fight Mode stays OFF (it would challenge the native apps' API calls). (3) Turnstile widget "GetCamino Interview" (since 2026-10-19) |

Nothing else touches money or accounts: Maestro is a local CLI, fonts ship in the
bundle, and Apple/Google sign-in ride the accounts above.

## Migration plan (superseded)

The 2026-07-12 plan moved every billing and contact email to andrew@getcamino.app. The
MadFiddlerLabs consolidation (October 2026) replaced it: accounts moved to MadFiddlerLabs
organizations or to andrew@andrewedmond.com, and the getcamino.app Workspace was merged
into andrewedmond.com on 2026-10-26.

## Evidence trail (how this list was derived, 2026-07-12)

- Env vars: `.env` + `eas env:list` across production/preview/development
  (ANTHROPIC, SUPABASE, RESEND, SENTRY, POSTHOG, CRON_SECRET; ELEVENLABS_* deleted 2026-07-12).
- Dependencies: `@anthropic-ai/sdk`, `@supabase/supabase-js`, `@sentry/*`, `posthog-*`, `expo-*`.
- Workflows: `.github/workflows/{ci,weekly-email}.yml` (GitHub Actions; repo public; `e2e-ios` deleted 2026-10-19).
- DNS: NS → alla/bryce.ns.cloudflare.com (Cloudflare zone, MadFiddlerLabs, since 2026-10-21; registrar
  still Namecheap); MX → smtp.google.com (the andrewedmond.com Workspace, getcamino.app as a secondary domain, since 2026-10-26); getcamino.app → Worker `getcamino` (custom
  domain); A supabase → 129.213.48.7 (Oracle box, DNS-only so Caddy keeps its own certificate); DKIM on
  resend._domainkey + CNAMEs send/rsend (Resend, re-pointed 2026-10-19).
- Cross-checked against the privacy page's processor list (`app/privacy.tsx`) — the two agree.
