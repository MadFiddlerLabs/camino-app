import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { palette } from '@/constants/Colors';
import { openExternal } from '@/lib/plan-format';
import Seo from '@/components/Seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

// "Show our homework" — the receipts behind the essay at /how-i-was-built. Every roadmap item in
// the order we actually took the work on, with what shipped and the decisions that shaped it.
// Public since 3 Jul 2026 (user decision): linked from the nav menu and in the sitemap.
// Sourced from TODO.md's completed items + the git history, so it stays honest.

type Row = { feature: string; date: string; work: string; decisions: string[] };

const ROWS: Row[] = [
  {
    feature: 'The walking skeleton',
    date: '30 Jun 2026',
    work: 'A deterministic plan engine (~7 obligations), a catalog-derived interview, Lola\'s persona prompt, and a report prototype — the whole pipeline end to end before any real app existed.',
    decisions: [
      'Model obligations, not journeys: ~100 finite atomic units generate the thousands of individual journeys for free.',
      'Four invariants written down before features: deterministic engine, catalog-derived interview, Lola never invents facts, plan = pure function of profile.',
      'The LLM gets exactly two bounded surfaces (phrase a question, extract an answer). Everything load-bearing is boring, testable code.',
    ],
  },
  {
    feature: 'The Expo app + auth + storage',
    date: '1 Jul 2026',
    work: 'Expo Router app targeting web, iOS, and Android from one codebase; Supabase Google sign-in; profiles saved per-user under RLS.',
    decisions: [
      'One codebase, three platforms — platform differences isolated into .native.ts twin modules Metro resolves automatically.',
      'Separate staging and production Supabase databases so a test can never touch a real user\'s data.',
    ],
  },
  {
    feature: 'Server-side LLM proxy',
    date: '1 Jul 2026',
    work: 'All Anthropic calls moved behind /api/lola (Expo API route on the hosting platform\'s Workers runtime); the client bundle no longer contains any key.',
    decisions: [
      'Secrets live only in server env vars — a browser bundle is public by definition.',
      'Layered, fail-open hardening: payload caps are the real enforcement; origin checks and per-IP limits are extra layers that never lock out legitimate users.',
    ],
  },
  {
    feature: 'Catalog expansion by webinar mining',
    date: '2 Jul 2026',
    work: 'Fifteen relocation-webinar transcripts mined by five parallel agents; the catalog grew from ~20 to 54 obligations across tax, property, visas, healthcare, and citizenship.',
    decisions: [
      'Every obligation carries a provenance tag from day one, enforced by the type system.',
      'Anything we couldn\'t ground was pulled to a backlog rather than shipped on vibes — invented precision (fake form numbers, made-up deadlines) got stripped.',
    ],
  },
  {
    feature: 'The living plan',
    date: '2 Jul 2026',
    work: 'Mark steps done (today or back-dated); completions re-anchor downstream deadlines to what actually happened; a free-text "something changed" box re-plans deterministically.',
    decisions: [
      'Progress is just more profile input — the engine stays a pure function.',
      'The LLM translates free text into a profile-field delta ONLY; the diff users see is computed deterministically, never narrated from imagination.',
    ],
  },
  {
    feature: 'Deploy pipeline + environments',
    date: '1 Jul 2026',
    work: 'EAS Hosting with development / staging / production environments, a custom domain, and a deploy script that pulls each environment\'s vars and clears bundler caches.',
    decisions: [
      'One early build silently baked the staging database into production — the fix became a permanent guard: the deploy script sources the pulled env, wipes caches, and prints exactly what it baked.',
      'Infrastructure came after the product had earned it, then all at once.',
    ],
  },
  {
    feature: 'iOS to TestFlight',
    date: '1 Jul 2026',
    work: 'Native builds through EAS with an App Store Connect API key (fully non-interactive), through review rejections to installable TestFlight builds; native Google sign-in, dictation, and Dynamic Island safe-areas verified on device.',
    decisions: [
      'Machine-drivable release infrastructure over click-ops: the API key lets any session cut a build.',
      'Fix rejections at the root (an unused library referencing the photo roll was removed, not excused).',
    ],
  },
  {
    feature: 'Staff tooling & gating',
    date: '2 Jul 2026',
    work: 'Dev test personas and internal cross-check links, first gated by environment + a user-id allowlist, later replaced by a server-owned is_staff flag on the profiles table.',
    decisions: [
      'Feature flags belong in the database, not hardcoded into client bundles — extended testers get access with one SQL update.',
      'The client can never write its own staff flag; column-level grants enforce it.',
    ],
  },
  {
    feature: 'Brand into product',
    date: '2 Jul 2026',
    work: 'The azulejo compass-star became the app icon set (iOS, adaptive Android, splash, favicon), generated from a single SVG by a script.',
    decisions: [
      'One source of truth, regenerated on demand — no hand-exported icon zoo.',
      'Apple rejects icons with alpha channels; the pipeline flattens automatically.',
    ],
  },
  {
    feature: 'Product analytics',
    date: '2 Jul 2026',
    work: 'PostHog on web and later native: a funnel from first visit through interview to roadmap, feature-health events, person profiles.',
    decisions: [
      'Every event stamped with its environment so our own testing never pollutes real usage.',
      'Local dev sends nothing — the key simply doesn\'t exist there.',
    ],
  },
  {
    feature: 'Lola\'s voice',
    date: '2 Jul 2026',
    work: 'ElevenLabs TTS behind /api/tts (key server-side), a warm Spanish-accented English voice, on by default, with a visible mute pill.',
    decisions: [
      'Two failed autoplay fixes are part of the record: browsers block audio without a user gesture. The real fix rides the gesture users already make ("Let\'s get started") to unlock a Web Audio context for the whole session.',
      'The sound control lives with the conversation, not in the reply composer — the composer is for composing.',
    ],
  },
  {
    feature: 'Official sourcing & the source taxonomy',
    date: '2 Jul 2026',
    work: 'Every webinar-derived claim researched against government sources; corrections applied (regional tax ranges, renewal windows, a voluntary-not-mandatory registry); the taxonomy simplified to official | recommendation.',
    decisions: [
      'A tag is not a citation — "official" ultimately came to require a canonical URL the user can check.',
      'Six items stayed honest recommendations rather than being dressed up as law.',
      'Webinar links were kept as staff-only cross-checks with timestamps — ideation material, not user-facing truth.',
    ],
  },
  {
    feature: 'Observability',
    date: '2 Jul 2026',
    work: 'Sentry across web, the API routes, and native iOS — one project tagged by platform and environment — plus an uptime monitor that pages on downtime, and daily budget caps on the paid API routes.',
    decisions: [
      'One Sentry project with tags beats three projects to manage.',
      'The Workers runtime fits no Sentry SDK, so the API routes send minimal envelopes by hand — a smaller correct thing over a bigger wrong one.',
    ],
  },
  {
    feature: 'Native parity',
    date: '2 Jul 2026',
    work: 'Three TestFlight builds brought iOS level with web: spoken Lola (expo-audio streaming a GET variant of the TTS route), native crash reporting with readable stack traces, native analytics.',
    decisions: [
      'Each build verified on a real device before being called done.',
      'Android deliberately deferred to the very end — no test device, no pretend testing.',
    ],
  },
  {
    feature: 'Citizenship vs. renewal — asking instead of assuming',
    date: '2 Jul 2026',
    work: 'A new interview question (do you hope to become a citizen, or keep renewing residence?) now gates the entire citizenship track; a second new question gates the scouting trip to people still choosing a region.',
    decisions: [
      'The engine had silently assumed everyone naturalises — a big assumption belongs to the user, deterministically, not to the catalog.',
    ],
  },
  {
    feature: 'The cold-eyed audit',
    date: '3 Jul 2026',
    work: 'A full fresh-eyes review of architecture, catalog, and interview found real bugs: a language-exam rule mishandling Filipino applicants, two interview answers collected but never read, the drift-check invariant living in dead code, and 28 "official" items with no citation attached.',
    decisions: [
      'Auditing your own product is scheduled work, not luck.',
      'Every fix shipped with a regression persona so it can\'t silently regress.',
      'The invariant checker was revived as a script that gates every deploy.',
    ],
  },
  {
    feature: 'The re-verification pass',
    date: '3 Jul 2026',
    work: 'All 28 uncited official obligations re-verified one by one against their issuing authorities (tax agency procedure pages, ministry information sheets, the BOE, the DGT, the Instituto Cervantes) and given canonical links; a missing EU-registration obligation was discovered and added.',
    decisions: [
      'The catalog reached 60 obligations: 55 official — every single one citable — and 5 honest recommendations.',
      'The audit\'s persona check exposed the EU gap: an empty plan is a finding, not a nuisance.',
    ],
  },
  {
    feature: 'The test suite & CI',
    date: '3 Jul 2026',
    work: 'A deterministic engine suite (15 tests, ~140 ms) runs in CI on every push and inside the deploy gate; API contract tests and a Playwright smoke suite run against the deployed staging site.',
    decisions: [
      'Fast, offline, deterministic tests gate deploys; anything paid or networked is opt-in so CI never burns tokens.',
      'The audit-fix regressions ARE the test fixtures — personas double as executable documentation.',
    ],
  },
  {
    feature: 'The sample plan',
    date: '3 Jul 2026',
    work: 'A public, read-only roadmap for a fictional couple — built by the real engine on a canned profile — with tap-to-expand deterministic detail and interview CTAs.',
    decisions: [
      'Show the payoff before asking for the interview\'s effort.',
      'The sample\'s arrival date floats months ahead so its deadlines never look stale.',
      'The LLM coach stays off the public page — a free anonymous LLM endpoint is an abuse surface, and the plan isn\'t the visitor\'s to edit. The expanded card teases what the real thing does instead.',
    ],
  },
  {
    feature: 'Sign in with Apple',
    date: '3 Jul 2026',
    work: 'The official Apple button on iOS, exchanging Apple\'s identity token directly for a session — no password, no web redirect. Three failed builds taught us Apple\'s provisioning model the hard way.',
    decisions: [
      'Provisioning profiles are immutable snapshots of capabilities — enabling a capability means re-minting the profile, not editing it. The playbook is now written down.',
      'The native token flow needs no Apple client secret — fewer credentials to hold is a feature.',
    ],
  },
  {
    feature: 'Overdue, honestly',
    date: '3 Jul 2026',
    work: 'Steps past their due date now say so in red — on the card, in the stats, and in the step sheet, which nudges: mark it done with the real date, or tell Lola what changed and the plan re-flows.',
    decisions: [
      'One deterministic predicate defines "overdue" everywhere — the roadmap today, the weekly email next.',
      'Due today is NOT overdue — you get until midnight before anything turns red.',
    ],
  },
  {
    feature: 'The keyboard, third time',
    date: '3 Jul 2026',
    work: 'The interview composer clipped behind the iOS keyboard through two attempted fixes. The framework\'s keyboard-avoidance component was removed entirely, replaced by a hook that pads by the exact overlap the OS reports.',
    decisions: [
      'When a framework abstraction guesses geometry and guesses wrong twice, stop tuning it — use the number the OS actually gives you.',
      'The two failed fixes stay in the record: that\'s what "verified on device" is for.',
    ],
  },
  {
    feature: 'A calmer nav',
    date: '3 Jul 2026',
    work: 'Signing in became one link that opens a dialog (Apple + Google, email next); narrow screens got a hamburger menu holding the browse links, leaving the bar to the two actions that matter.',
    decisions: [
      'Actions live on the bar, browsing lives in the menu — and future content sections have a home waiting.',
      'The split is viewport-width, not platform: an iPad earns the full bar, a narrow desktop window earns the burger.',
    ],
  },
  {
    feature: 'The email loop, part one',
    date: '3 Jul 2026',
    work: 'Passwordless sign-in (magic link + one-time code) joined the dialog; a signed-out roadmap can be emailed to yourself — which quietly creates your account, with the roadmap riding along; a welcome email greets new users; and a weekly roundup engine (overdue + upcoming, capped at five, deterministic per-item tips) waits on its cron.',
    decisions: [
      'Email over app-store notifications as the retention loop: everyone has an inbox, and every email doubles as a no-password door back into the roadmap.',
      'The roundup is a pure function of the profile — the same engine math as the roadmap, so the email can never disagree with the app.',
      'Nothing pressing this week → no email. A roundup with nothing to say is spam.',
      'Sending is Resend on our own domain; all bookkeeping (welcomed, nudged, opted out) lives in auth metadata, so no schema migration.',
    ],
  },
  {
    feature: 'The public roadmap',
    date: '3 Jul 2026',
    work: 'This section gained a third page: the product roadmap, updated with every release — shipped, in progress, next, and the things we\'ve said no to.',
    decisions: [
      'Saying no is part of the roadmap: no document vault (we refuse to be a honeypot for passports), no second country yet, no features on spec.',
      'Updating it every release is a standing rule, written into the repo\'s instructions.',
    ],
  },
  {
    feature: 'The email loop, live',
    date: '3 Jul 2026',
    work: 'The welcome email and weekly roundup went live end-to-end: server keys landed, both environments redeployed, a real weekly run fired from the scheduler, and real emails read in a real inbox. The live test caught two bugs no unit test saw: email links leaked the hosting platform\'s per-deploy URL instead of getcamino.app, and one sign-in sent the welcome email three times.',
    decisions: [
      'Test the loop by receiving the email, not by reading the code — both bugs were only visible in an actual inbox.',
      'Links in emails come from one canonical per-environment origin, never from the request URL a proxy hands you.',
      'The triple-send was two races stacked: the client now fires the welcome request once per sign-in, and the server claims the "already welcomed" flag before sending, rolling it back if the send fails.',
    ],
  },
  {
    feature: 'Sixty free guides',
    date: '3 Jul 2026',
    work: 'Every catalog obligation got a public page (/guide/<id>): when it\'s due, why it matters, what comes first, the official source, and a category tip — plus a grouped index, prerendered HTML titles and descriptions for search engines, and a sitemap. The nav also unified: desktop now gets the same ☰ menu as mobile, with Sign out inside.',
    decisions: [
      'The catalog is the single source: pages are generated from the same data the engine plans with, so a guide can never disagree with a roadmap.',
      'Timing is described as the RULE ("due within 30 days of arrival"), never a fabricated date — personal dates only exist in a real roadmap, which is what the page\'s CTA is for.',
      'The sitemap is generated from the catalog too — adding an obligation automatically adds its page to search.',
      'The unlisted "how I was built" section stays out of search; the guides are the front door.',
    ],
  },
  {
    feature: 'The "This week" view',
    date: '3 Jul 2026',
    work: 'The roadmap gained a second lens: a toggle that filters to just what needs attention now — what\'s slipped past, and what\'s due in the next seven days. A clear week gets an honest "nothing needs you this week", with the next dated step so you know what\'s coming.',
    decisions: [
      'It\'s a filter over the same deterministic plan, not a second plan — the buckets keep the dependency-safe order, never re-sorted by date.',
      'Due today is "this week", not overdue — the same midnight-grace rule as everywhere else, one predicate shared with the red treatment and the weekly email.',
      'Steps still waiting on a milestone (no honest date) are never shown as "next up" — no fabricated urgency.',
    ],
  },
  {
    feature: 'Family-testing fixes, round one',
    date: '3 Jul 2026',
    work: 'Real devices found what simulators don\'t: the emailed sign-in code is 8 digits but the app said — and silently truncated to — 6, so codes could never verify; and the step drawer wouldn\'t scroll on iOS, hiding Lola\'s answers.',
    decisions: [
      'Never hardcode another system\'s format: the code length is the auth provider\'s choice, so the app now accepts whatever arrives and the copy just says "one-time code".',
      'The drawer bug was a wrapper stealing the scroll gesture — the tap-to-close backdrop now sits behind the sheet instead of around it.',
    ],
  },
  {
    feature: 'Sign in with Apple, solved',
    date: '3 Jul 2026',
    work: 'A five-build mystery: Apple\'s own sign-in sheet rejected only this app, while every layer we could check was provably correct — the entitlement inside the signed binary, the App ID capability, fresh provisioning profiles, the auth provider config, active developer agreements. The failure lived in none of them: Apple\'s server-side provisioning for the App ID had gone stale. Toggling the capability off and back on forced a re-provision, and sign-in started working — even on the older builds.',
    decisions: [
      'Eliminate by evidence, not vibes: each layer was verified with an artifact (the IPA\'s own entitlements, the portal config, the agreement dates) before moving to the next.',
      'The decisive clue was that an OLD build started working the moment the capability was re-provisioned — proof the broken state lived on Apple\'s servers, not in anything we shipped.',
      'When every checkable layer is correct and the platform still fails, re-provision before you rewrite.',
    ],
  },
  {
    feature: 'The homework goes public + links that open the app',
    date: '3 Jul 2026',
    work: 'This whole section — the essay, this log, the roadmap — left the unlisted shadows: it\'s in the nav menu and the sitemap now, and every entry carries its ship date. And the links in Get Camino\'s emails gained universal links, so tapping "Open your roadmap" on an iPhone opens the app (signed in) instead of a logged-out browser tab.',
    decisions: [
      'Building in the open was already the point — hiding the receipts behind a direct link stopped making sense once the guides made content the front door.',
      'Dates on every entry keep the log honest about pace: this product went from empty repo to sixty guides in four days, and the record should show it.',
      'Universal links are configuration, not code: an entitlement plus a JSON file the domain serves — and Apple caches that file on install, so it only kicks in from the next build.',
    ],
  },
  {
    feature: 'The printable roadmap + a way to talk back',
    date: '3 Jul 2026',
    work: 'The roadmap became a report: one tap renders a clean, print-ready PDF — hero next step, estimated vs firm dates, dateless steps that say what they\'re waiting for, official source URLs printed for the gestor. And a "Report a problem" line joined the menu: one text box, straight to the team inbox with platform, version and route attached. iPad support switched off for the first release.',
    decisions: [
      'The report is a pure function of the plan (the fourth thesis piece, finally shipped) — same honesty rules as the app: estimated says estimated, waiting says waiting, nothing invented.',
      'One HTML generator serves both platforms: the browser\'s own print dialog on web, a real shared PDF file on iOS — no PDF library shipped to anyone.',
      'Feedback goes to email, not a dashboard: at family-testing scale, the inbox IS the triage queue, and the recipient is hardcoded so the route can\'t be abused as a mail relay.',
      'iPad off for launch: fewer screenshots, fewer review surfaces, nothing the phone experience doesn\'t already prove.',
    ],
  },
  {
    feature: 'Polish pass: the front door catches up',
    date: '3 Jul 2026',
    work: 'The home and how-it-works pages predated almost everything shipped this week. Now: every public page has a real title, description and canonical URL (only the guides had them); how-it-works finally ends with a call to action, mentions the weekly email and the sourced guides, and uses the shared footer; the home topic strip links into the sixty guides it was always describing.',
    decisions: [
      'A page that explains everything and asks for nothing is a leak — every marketing page now ends with the same honest CTA.',
      'One shared breakpoint hook replaced two copies of a subtle hydration workaround — the second copy had the bug the first one fixed.',
      'The deploy script now strips iCloud conflict-copy directories from the export: one deploy silently shipped stale pages while the local build was correct.',
    ],
  },
  {
    feature: 'Family-testing fixes, round two',
    date: '4 Jul 2026',
    work: 'A second phone found four more: the feedback spinner could run minutes after the report had already arrived (the response stalls on some networks; a grace period now thanks you once the send is safely away); the step drawer\'s inputs hid under the keyboard (it now slides above it by the exact overlap the OS reports); Lola claimed to have "remodelled your plan" when nothing had moved (a no-op re-plan now says so honestly, and appointment dates are steered to "mark done on a date"); and the nav bar wrapped into two lines at larger iOS text sizes (bar labels now cap their scaling — menu items still scale fully).',
    decisions: [
      'Same phone model, different bug: accessibility text size is a device dimension of its own — test with it.',
      'Never let a celebration outrun the diff: "I\'ve remodelled your plan" is only said when a date actually moved.',
      'When the work is provably done but the network is slow to say so, thank the user and stop the spinner — and count how often it happens.',
    ],
  },
  {
    feature: 'The guides learn to talk',
    date: '4 Jul 2026',
    work: 'All sixty guide pages gained a written explainer — what the step actually is, how the process feels, who\'s involved — in Get Camino\'s voice. Each page\'s search snippet now uses its own opening sentence instead of a shared template.',
    decisions: [
      'The honesty rule became a build gate: a test fails if the prose contains any number that isn\'t already in that step\'s own title — new figures and deadlines can only live behind the official source link.',
      'The lint caught its first violation before shipping (a cross-referenced form number) — the mechanism works.',
      'Narrative explains, data asserts: prose adds context and texture, while every checkable fact stays in the catalog where the audit can see it.',
    ],
  },
  {
    feature: 'Family-testing fixes, round three',
    date: '4 Jul 2026',
    work: 'A former QA engineer joined the testing and it shows: Lola\'s voice dropped to phone-call volume after the first line (the microphone session was rerouting audio to the earpiece — playback now reclaims the loud speaker every time); a clarifying question mid-interview got a canned "sorry, didn\'t catch that" (Lola now answers what you asked, then re-asks — still forbidden from stating legal facts there); "on a date" became "did it earlier? add the date" with a forgiving date field that reads "25 April 2026", Spanish months, and "yesterday" — and shows you what it understood before saving; and the printable report got print-safe contrast and real page margins.',
    decisions: [
      'Date entry is a parser, not an AI: instant, offline, and incapable of hallucinating — and when input is genuinely ambiguous (04/05/2026) it asks rather than guesses.',
      'The conversational interview keeps the honesty wall: Lola can explain what a question means, never what the law says — that lives in the sourced roadmap.',
      'Print is its own medium: colors that read on a screen wash out on paper, and iOS ignores CSS page margins entirely — the report now carries both itself.',
    ],
  },
  {
    feature: 'The boring pages that make a real product',
    date: '4 Jul 2026',
    work: 'Privacy policy, terms of use, and aviso legal — plain language, linked from every footer. Delete my account, in the menu: one warning, one tap, immediate and permanent (tested live, start to finish). And web analytics went cookieless, so there\'s no consent banner because there\'s nothing to consent to.',
    decisions: [
      'Account deletion is both Apple\'s requirement and the GDPR\'s right to erasure — one honest implementation serves both: hard delete, no grace period, no dark patterns to keep you.',
      'No cookie banner by design: analytics that persist nothing client-side beat a banner everyone resents.',
      'Legal pages follow the homework-page rule: if a data flow changes, the privacy page changes in the same PR.',
    ],
  },
  {
    feature: 'Links that dress well',
    date: '4 Jul 2026',
    work: 'Every public page now unfurls properly when shared: a branded card (the compass-star tile, the promise, the domain) plus per-page social titles and descriptions. One Seo component owns the whole tag set, so no page can ship half of it.',
    decisions: [
      'Get Camino\'s links will live in WhatsApp threads and expat Facebook groups — a bare gray link and a branded card are different products there.',
      'The share card is generated from the same brand-mark code as the app icons: one geometry, every surface.',
    ],
  },
  {
    feature: 'Polish: structured data, a smarter front door, and quieter motion',
    date: '4 Jul 2026',
    work: 'Search engines now get structured data (article + breadcrumbs on every guide, the full catalog as a list, the site itself); arriving at the interview from a guide gets acknowledged ("so glad you\'re looking into getting your NIE sorted") before the first question; and an accessibility pass landed — the rotating home photo rests when your system prefers reduced motion, controls carry proper roles and labels, and inputs are named for screen readers.',
    decisions: [
      'The interview greeting may acknowledge WHERE you came from, never facts about the topic — phrasing is the only surface the model owns.',
      'Per-deploy preview URLs are now first-class origins for our own APIs: the hardening was blocking our own pre-production verification.',
    ],
  },
  {
    feature: 'The plan learns geography',
    date: '4 Jul 2026',
    work: 'Spain isn\'t one rulebook: transfer tax, wealth tax, school admission windows and property tax all vary by comunidad autónoma. The interview now asks where you\'re settling (name a city and Lola places it in its region), and every region-varying step says so — on your roadmap, in the guides, and on the printed report — naming your region when it\'s known.',
    decisions: [
      'Honest v1: the plan KNOWS your region and flags what varies there. Shipping 17 regions of rates without per-region official sources would break the no-invented-facts rule — that\'s a sourced content pass, now queued.',
      '"Not sure yet" is a first-class answer: undecided movers get the scouting step and generic flags, not a forced guess.',
    ],
  },
  {
    feature: 'The robots test the app now',
    date: '4 Jul 2026',
    work: 'End-to-end tests grew up: the web suite now signs in as a seeded test user (through the real magic-link machinery, no inbox involved) and walks the journeys that matter — saved roadmap, the week view, mark-done and undo, the no-op honesty gate, sign out. Twelve tests, twelve seconds, against the live staging site. Native flows are written for the iOS simulator and run on a free CI runner with zero build credits. First catch, before it even finished: a React hydration error firing on every page load (the nav wordmark rendered differently on server and client).',
    decisions: [
      'Tests sign in through the same code path real magic links use — a test-only backdoor would test the backdoor.',
      'The test user lives ONLY in staging, and the seed script hard-refuses to run against production.',
      'Runs are manual + pre-release, not per-push: each one spends real LLM calls, and our own rate limits apply to us too.',
    ],
  },
  {
    feature: 'A spinner is a moment, not a destination',
    date: '4 Jul 2026',
    work: 'Family testing round five, all fixed: the app could cold-start into an eternal "Loading your roadmap…" (it now knows when there\'s nothing to load and takes you home); an interview answer could spin forever if the network hung (35-second limit, then Lola owns it and your answer is back in the box to resend); the microphone cue now appears when the mic is actually hot — so fast talkers stop losing their first words — and tapping it off keeps your last words instead of discarding them; and the answer box grows again as you dictate.',
    decisions: [
      'Every waiting state needs an exit: a timeout, a fallback, or a redirect — nothing may wait forever.',
      'Two ways to end dictation, deliberately: mic-off KEEPS the recognizer\'s final flush (your last words); send DISCARDS it (it would refill the box that just cleared).',
    ],
  },
  {
    feature: 'Keyboard focus you can see',
    date: '4 Jul 2026',
    work: 'Tab through any page and an amber ring — the brand\'s waypoint color — shows exactly where you are. Keyboard users get the ring; mouse and touch clicks don\'t.',
    decisions: [
      'Amber over cobalt: the one brand color that reads on both the cream background and the dark indigo bands.',
      ':focus-visible, not :focus — a11y for keyboard users shouldn\'t add visual noise for everyone else.',
    ],
  },
  {
    feature: 'The paid endpoints learned to say no',
    date: '4 Jul 2026',
    work: 'The two endpoints that cost real money per call — Lola\'s brain and Lola\'s voice — now carry real volume limits: a per-visitor per-minute cap and a global daily budget each, counted durably in the database. The in-memory counters they replace reset whenever the platform recycled a worker (a 70-request burst produced zero throttles); the new ones trip at exactly their limit, verified live. Cross-site browsers are locked out too: the platform\'s default wide-open CORS answer is replaced with a strict one pinned to our own origins.',
    decisions: [
      'Fail open, bounded in dollars: if the counter database hiccups, users keep working — and provider spend caps bound the worst case. Availability first at this scale.',
      'Only requests that would actually reach the paid provider consume budget — malformed junk can\'t starve the day\'s capacity.',
      'Measured before believing: the platform rewrites the Origin header and quietly recycles in-memory state, so every layer was burst-tested against the real runtime, not the docs.',
    ],
  },
  {
    feature: 'The microphone and Lola learn turn-taking',
    date: '4 Jul 2026',
    work: 'Family testing round four (build 27) nailed the last voice bug with a precise diagnosis: earlier builds only DUCKED Lola\'s voice while the mic was open — and never released the duck, so everything after went quiet. Build 27 fixed the volume but left her talking over you. Now it\'s explicit turn-taking: opening the mic cuts her line outright, and every later line plays at full volume. Also fixed: your spoken answer no longer reappears in the next question\'s box (the recognizer flushes one last result after it\'s told to stop — that flush was refilling the input the send had just cleared).',
    decisions: [
      'Replace audio-session side-effects with explicit app-level behavior: "mic opens → Lola stops" is one deterministic line, not a hardware mode.',
      'Treat late recognizer events as stale by default — a gate flips before the engine is told to stop, on both web and iOS.',
    ],
  },
  {
    feature: 'A safer name: Get Camino',
    date: '4 Jul 2026',
    work: '"Camino" is a lovely word — which is exactly the problem: plenty of businesses already want a piece of it. Until a proper trademark search happens, the app and site go by Get Camino (matching the domain we already own), extended brand "Get Camino: Your Road to Spain" — which happens to fit the App Store\'s 30-character name limit exactly. Every user-facing surface renamed: the name under the icon, the nav, the emails, the printed report, the legal pages, and how Lola introduces the product.',
    decisions: [
      'Brand defensively before brand spend: a distinctive compound beats a common word you\'d have to fight for.',
      'Identifiers never chase brands: the bundle id, URL scheme, and internal names stay put — a rename should never break sign-in or saved links.',
    ],
  },
  {
    feature: 'Every official source link, click-tested',
    date: '4 Jul 2026',
    work: 'All 55 official source links were fetched and checked against their steps — status, where they redirect, and whether the page is actually about the step. Two failed honestly: the empadronamiento link died when a government portal was retired (now points at the law itself, art. 15 of the Ley de Bases del Régimen Local), and the NIE link landed visitors on a police-site cookie wall instead of NIE content (now the Ministerio del Interior\'s canonical NIE page).',
    decisions: [
      'Trust content, not status codes: administracion.gob.es serves "Error" pages with HTTP 200, so every link was verified by its actual heading, not its response code.',
      'When a government info page is unstable, cite the law itself — BOE links outlive portal redesigns.',
    ],
  },
  {
    feature: 'How-it-works redesign + "the product roadmap"',
    date: '4 Jul 2026',
    work: 'The how-it-works page — untouched since the earliest days — got a layout pass: its sections ran edge-to-edge on desktop while every other page reads in a centered column, so each section\'s content now sits in the same 760px column, and the bureaucracy card says what the plan just learned (rules that differ by comunidad are flagged). This page was also renamed "the product roadmap".',
    decisions: [
      'Full-bleed section backgrounds stay — only the content inside is constrained. The rhythm of alternating bands is the page\'s structure; the fix was readability, not a rebuild.',
      'Renamed to differentiate: "roadmap" is what Get Camino builds FOR YOU in the product; "the product roadmap" is where the product itself is going.',
    ],
  },
  {
    feature: 'A real inbox and a real operator',
    date: '4 Jul 2026',
    work: 'The product stopped using a personal Gmail: feedback@, privacy@ and legal@getcamino.app now route reports and rights requests (delivery tested end-to-end), and the legal pages name the actual operator — AELaboratories, Inc — with governing law updated to match its state. The path to a formal company is deliberately deferred: sole proprietorship until there\'s a proven revenue model.',
    decisions: [
      'Purpose-named addresses over one generic inbox: where an email lands tells you what it is before you open it — and they all route to a single mailbox anyway.',
      'Incorporate when revenue proves the model, not before — the migration is mostly behind-the-scenes store agreements, so waiting costs little.',
    ],
  },
  {
    feature: 'The plan for Spanish',
    date: '4 Jul 2026',
    work: 'A moving-to-Spain product that only speaks English lacks authenticity — so localization moved from "someday" to before launch. The technical design is written and approved: Spanish first (verified by a native-speaking family member), then French, German and Italian as fill-in-the-blanks exercises on the same plumbing. The engine stays language-free; translation is purely presentation.',
    decisions: [
      'Invariant 3 extends to translations, mechanically: a translated step may never carry a number its English source doesn\'t — the digit-lint now guards every language.',
      'The language switcher is a feature, not a setting: each language listed in its own name, visible in the menu, because a Spanish speaker lost in an English UI can always find "Español".',
      'Lola says tú, not usted — warmth is her voice in every language. And "Get Camino" and "Lola" never translate.',
    ],
  },
  {
    feature: 'Take it with you (and get back to the top)',
    date: '4 Jul 2026',
    work: 'The home page now says where the app is headed: a quiet band announcing the iPhone and Android apps — honestly marked "coming soon," not a fake download badge for something you can\'t download yet. And long scrolls got a back-to-top button: on the roadmap, the sample plan, and the sixty-step guide list, a floating arrow appears once you\'ve scrolled a screen down and takes you home in one tap.',
    decisions: [
      'Honest placeholders over impressive-looking lies: no official store badge appears until there\'s a real listing behind it — swapping in the link is a one-line change when the apps ship.',
      'The back-to-top button respects reduced-motion: it jumps instantly instead of animating for anyone who\'s asked their device to calm down.',
    ],
  },
  {
    feature: 'The language plumbing (Spanish is coming)',
    date: '5 Jul 2026',
    work: 'Every button, question, and label in the app\'s core screens moved out of the code and into English string catalogs — the plumbing that lets the whole experience ship in Spanish next. A visible language choice now lives in the menu, and four automatic checks guard every future translation: no missing strings, no translation may ever change a number, placeholders must survive, and the names "Get Camino" and "Lola" stay exactly themselves in every language.',
    decisions: [
      'Prove the plumbing changed nothing: after the extraction, the app renders character-for-character identical — the whole test suite, the frozen plan snapshots, and the prerendered pages all agree.',
      'A translation may never change a number — the catalog\'s oldest rule now applies mechanically to every language file before it can ship.',
      'The language switcher is a feature, not a buried setting: it sits in the menu on every screen, and each language will be listed in its own tongue.',
    ],
  },
  {
    feature: 'Y luego, cuatro idiomas más: the web speaks five languages',
    date: '5 Jul 2026',
    work: 'The same afternoon Spanish shipped, the plumbing proved itself: French, German, and Italian followed — each with the full interview, all sixty step titles and sixty guide explainers, emails, and the printable roadmap. The web grew real per-language pages that search engines can find, every page telling crawlers about its four siblings. And a user question exposed a real gap, fixed the same hour: your language now follows you from the browser into your inbox, so the weekly email never speaks the wrong language.',
    decisions: [
      'One registry, every guardrail: a new language enrolls in all the automatic checks at once — number-preservation, completeness, brand names — or it can\'t ship at all.',
      'The deploy gate earned its keep: a routing change quietly broke every single-segment page on staging, the automated post-deploy tests caught it, and production was never exposed.',
      'German taught the brand rule a lesson: compound words like "Get-Camino-Roadmap" are natural German and still not allowed — the brand check caught them, and the sentences were rewritten around the name.',
      'Legal stays honest per language: Spanish has a reviewed courtesy translation; the newer languages say plainly, in their own words, that the legal pages are in English.',
    ],
  },
  {
    feature: 'Hablamos español',
    date: '5 Jul 2026',
    work: 'In one day, the whole product learned Spanish: Lola interviews in warm, informal Spanish; all sixty roadmap steps and their sixty written guides read natively; dates, emails, and the printable roadmap follow your language; the legal pages carry a faithful courtesy translation; and the sample roadmap belongs to Susana y Tomás. English users see a byte-identical product — proven by frozen snapshots that didn\'t change.',
    decisions: [
      'Tú, not usted — the user chose warmth, and Lola\'s Spanish is instructed to match, never formal.',
      'The engine never learned what a language is: which steps you get, their order, and every date are identical in every language — frozen plan snapshots prove it.',
      'Every legal number survives translation mechanically: the €28,800 threshold, form EX-15, the 90-day validity window — a lint fails the build if any translation changes a digit.',
      'Names belong to languages: each locale meets a sample couple with names native to it, and the brand "Get Camino" and "Lola" stay exactly themselves everywhere.',
      'Ship at 95% and verify in production: the Spanish is machine-drafted and mechanically linted, with a native-speaker pass running against the live site — corrections land as reviewable diffs.',
    ],
  },
  {
    feature: 'The fresh-eyes testing audit',
    date: '5 Jul 2026',
    work: 'Before translating the app into Spanish, every layer of testing was audited with fresh eyes: the coverage map verified against what actually runs, ten critical user paths given honest verdicts, and last week\'s under-pressure scoping decisions re-examined. Three new safety nets landed: live tests proving the interview already understands Spanish answers, pixel-exact snapshots of every email and the printable report, and API checks that now run on every staging deploy.',
    decisions: [
      'A gate that silently doesn\'t run isn\'t a gate: a deploy that can\'t run its test suite now fails loudly instead of shipping unchecked.',
      'The test-database guard became an allowlist — only the staging database may ever be seeded, rather than merely refusing the one known production one.',
      'Prove the hard part before the mechanical part: the interview demonstrably speaks Spanish before a single UI string is translated.',
      'Prior decisions were re-verified, not inherited — the trimmed native test flow and the excluded deep-link flow both survived scrutiny, with the tool version now pinned for reproducible runs.',
    ],
  },
  {
    feature: 'The bug-fix pass — and one that mattered',
    date: '5 Jul 2026',
    work: 'With five languages live and real family testing underway, a round of fixes: the sign-in code email now arrives in your language (it comes from a different system than the other emails and had been missed), the interview responds instantly when you switch languages mid-conversation instead of forcing a reload, and small wording polish across languages. The headline, though, was a silent one caught by an eagle-eyed look at the database: signed-in users\' saved roadmaps had quietly stopped persisting.',
    decisions: [
      'A well-meant security change caused it: locking down which columns a signed-in user may write accidentally blocked the exact save the app performs — and the failure had been swallowed in code, so it hid for days. The fix restored saving on the live databases, and now any save failure raises an alarm instead of vanishing.',
      'Tests can be blind in a specific way: the automated tests checked that the screen looked right, not that the database actually kept the data — so a save that silently failed still passed. The lesson is written down where the next person will see it.',
      'The clue was in the pattern: only older accounts had saved data, and they happened to be a single sign-in method. It looked like a sign-in bug; it was a timing coincidence around when the security change landed. Chasing the real cause beat trusting the obvious story.',
    ],
  },
  {
    feature: 'Five languages reach the iPhone',
    date: '5 Jul 2026',
    work: 'The web had spoken five languages for a day; now the iOS app does too. A new TestFlight build carried the localization work and the mid-interview language fix onto the phone, gated behind the full native release checks first — the simulator user-flows had to pass before a single build credit was spent. Verified on a real device: the interview switches languages mid-conversation, every menu item reads right in all five, and the English-only build story hides itself outside English.',
    decisions: [
      'The native end-to-end tests are a release gate, not a per-change checkpoint — they run before the build that ships, so the phone is never the place a regression is first seen.',
      'Build credits are spent deliberately: the gate goes green first, then one build, verified on device before it counts as done.',
    ],
  },
  {
    feature: 'The first strangers',
    date: '6 Jul 2026',
    work: 'The first public exposure: one plainly-disclosed post in a moving-to-Spain community, web only. About 1,200 views and two complete stranger journeys — first visit to finished roadmap — one in English, one in Spanish, zero user-facing errors. Hours later the post was auto-removed by the community\'s moderation machinery, the standard fate of anything reported as self-promotion. The overnight watch stood down; the always-on error and uptime alerts kept the site paged regardless.',
    decisions: [
      'Ask the moderators first: pre-approval is the only reliable immunity to report-driven removal — now the standing rule for every channel that follows.',
      'The funnel data outlived the post: it said the interview was the wall (the worst question was asked second, completion took twice the promise, most starters never finished) — and that verdict set the next week\'s agenda.',
      'A daily spending cap on the AI budget was raised deliberately ahead of traffic, with the provider\'s own hard limit kept as the real backstop.',
    ],
  },
  {
    feature: 'The interview becomes a living roadmap',
    date: '10 Jul 2026',
    work: 'The first strangers to use Get Camino told us — through the analytics, not in words — exactly where it lost them: the interview. The worst question was the second one asked, finishing took twice the promised time, and most people who started never saw a roadmap at all. So the interview was rebuilt around one idea: show the value while you answer, not after. Your roadmap now builds live beside the conversation — every answer visibly adds steps (on a phone, a step counter grows as you go). Most questions became single taps instead of typed sentences, every question now says why it\'s being asked, and the opener is the question every mover is already asking themselves: when? Fewer questions, too — an audit traced each one to the steps it unlocks, merged two pairs into single taps, and deleted one that turned out to feed nothing at all. And if you leave halfway, your progress now waits for you when you come back.',
    decisions: [
      'Every question must earn its place. The audit traced each question to the roadmap steps it decides; one had quietly been feeding nothing and was deleted, and the income question was kept only by giving it a real job — warning you, conservatively, when a plan looks short of a visa route\'s income requirement.',
      'Taps beat typing. Questions with fixed answers became buttons; the AI now works only where open answers genuinely need it — and "something else" is always one tap away when the buttons don\'t fit.',
      'Measurement has to survive the change it measures: every analytics event is now stamped with the interview version, because a redesign that also redefines its own metrics can tell itself any story it likes.',
    ],
  },
  {
    feature: 'The homepage learns to show, not tell',
    date: '10 Jul 2026',
    work: 'The homepage and the "how it works" page merged into one scrolling story — but not by guessing. Four different homepage philosophies were built as local prototypes and walked side by side: one where the page IS the first interview question, one that demos the product in the hero, one that leads with the finished roadmap, and one that keeps the postcard warmth of Spain up top with the demo one scroll below. The postcard won. The new page keeps the rotating photos, then shows a roadmap literally building itself as questions get answered, then the proof: a real sample roadmap and the promise that matters — 100% free, no catch.',
    decisions: [
      'Show, don\'t tell: the old page needed three paragraphs to explain the product; the new one plays a fifteen-second loop of it working. The redesigned interview made the mechanism watchable, so the marketing gets to stop describing.',
      'Emotion opens the door, mechanics close: people move to Spain with their hearts, so Spain stays above the fold and the machinery lives one scroll down — where the skeptics actually are.',
      'Variants were disposable by design: built outside version control, compared with real hands, and only the winner was ever committed.',
    ],
  },
  {
    feature: 'The night-feedback batch: Lola gets her charm back',
    date: '10 Jul 2026',
    work: 'An evening testing pass by the builder and his wife produced six findings, fixed the same night. The biggest: toning down Lola\'s reactions earlier that day had gone too far — she\'d stopped noticing things. Her reactions now see the whole conversation again, so she can connect your answers ("the whole family is coming, dog included"), while the hard rule stands: she may never state a fact, number, or deadline outside your sourced roadmap. Also: arriving from a guide page is acknowledged again ("I see you\'ve been reading about the padrón…"), the first question opens with the move itself instead of a clever framing, voice is now opt-in rather than on-by-default, a stale menu item went away, and the roadmap sheet no longer hides its close button under the iPhone\'s Dynamic Island.',
    decisions: [
      'Warmth needs memory: a reaction that can\'t see earlier answers can only be generic. The fix wasn\'t "write warmer prompts" — it was giving the bounded surface the transcript.',
      'Personalization without the LLM: the guide-page greeting is a deterministic template around a localized title — the charm of context, none of the variance.',
      'Voice flipped to opt-in: taps made turns fast enough that auto-playing audio read as noise, not warmth.',
    ],
  },
  {
    feature: 'Voice retired, a calmer finish, and a real contact page',
    date: '11 Jul 2026',
    work: 'A full fresh-eyes pass (Cristina) closed the week: Lola\'s spoken voice is gone entirely — opt-in wasn\'t enough; text-to-speech never fit the fast chip interview — while microphone dictation stays for those who need it. The marketing copy caught up ("a short interview", not "a conversation"). The interview\'s ending got its missing beat: your final note is acknowledged, then "Getting your roadmap ready — 3… 2… 1" hands over to the roadmap instead of an abrupt jump. The mic button now draws the standard dictation glyph instead of an emoji. And "Report a problem" grew into a proper Contact page — general questions, feedback, or problem reports, one form, linked from every footer.',
    decisions: [
      'Kill features by verdict, not sunk cost: TTS had server proxying, caching, and autoplay-unlock engineering behind it — and none of that argued against the observed experience.',
      'Endings deserve design: the countdown isn\'t decoration, it\'s the acknowledgment that the user just gave you their story and something is being built from it.',
      'One contact surface, topics not channels: the topic selector collapses server-side to a fixed list, so the email subject can never be attacker-chosen text.',
    ],
  },
  {
    feature: 'The engine audit: one night, fifteen findings, and a catalog that grew to 73',
    date: '13 Jul 2026',
    work: 'A real household using the product found what no test had: a Spanish passport holder offered the foreigner registration, a mixed household whose American spouse had no residence step at all. So the whole rule engine got audited in one sitting — every condition on every obligation, against a new tool that builds plans for 181 realistic profiles and checks class-level expectations. Fifteen findings; the fixes shipped the same night: the padrón no longer vanishes for movers still choosing housing, job seekers aren\'t routed to the no-work visa, short-stay tourists don\'t get the residence-visa roadmap, EU licences aren\'t sent to the driving exam, EU citizens can finally say they want citizenship. Then the audit\'s backlog: nine new officially-sourced steps (employer-sponsored work visas, self-employment, students, the Schengen clock, the EHIC — and the one-year citizenship fast-track for spouses of Spanish citizens), the driving-licence exchange list corrected against the DGT\'s own table, corporate tax gated behind one new question, and verified regional tax figures completed for every region on the map, foral territories included.',
    decisions: [
      'The audit\'s sharpest lesson: FOUR tests were found asserting bugs as correct behavior — including a persona modeled on the reporting household. Tests encode beliefs; the fix discipline now includes auditing the tests too.',
      'The verification habit paid three times in one pass: Valencia\'s transfer tax, Murcia\'s transfer tax, and Valencia\'s wealth exemption had all changed recently — official regional FAQs were stale on two of them; the law as published won.',
      'Every figure that couldn\'t be verified at the source stayed OUT: school windows (they move yearly) and municipal IBI rates show nothing rather than something secondhand.',
      'The matrix tool stays: 181 profiles × 16 expectations run on every future catalog change, so condition bugs of this class can\'t come back quietly.',
    ],
  },
  {
    feature: 'The final note learns to act — and removals speak up',
    date: '12 Jul 2026',
    work: 'The interview\'s closing "anything else I should know?" note is no longer just stored — it\'s distilled through the same bounded extractor as the roadmap\'s "something changed" box, so "the dog is coming too" adds the pet steps before you even reach your roadmap. Answers that simplify your plan now say so: a "−N steps — simpler for you" pill joins the "+N new steps" one, instead of steps vanishing silently. And a UK tester\'s flag fixed a US-centric step title: the consulate-appointment step no longer quotes US wait times to everyone — wait times vary widely by consulate, and the step now says exactly that, in all five languages.',
    decisions: [
      'Same bounded surface, new door: the note extractor emits typed profile fields only — the engine still authors every step and date, and a note that maps to nothing simply stays prose.',
      'Honesty cuts both ways: the live roadmap celebrated additions but hid removals; narrating "simpler for you" is the same truthfulness pointed the other direction.',
      'A soft, country-specific estimate had no place in a universal step title — the consulate\'s own booking page (the step\'s existing official source) is the truth, and the title now defers to it.',
    ],
  },
  {
    feature: 'The trust batch: changelog, verified stamps, share links, four sample lives, real regional rates',
    date: '12 Jul 2026',
    work: 'One afternoon, four features that had waited in the backlog. A public changelog now records every catalog correction, dated and in plain language — and every step carries a "last verified" date linking to it. Your roadmap became shareable: a read-only link that encodes your answers (never your notes) and renders through the same engine, no account needed. The sample plan became four sample lives — US retirees, a German family on the EU path, a Canadian digital nomad, a British couple who already own a home here. And the first verified regional figures shipped: real transfer-tax rates for the four biggest expat regions plus the Madrid/Andalucía wealth-tax reliefs, each checked that day on the region\'s own tax portal.',
    decisions: [
      'The verification pass paid for itself immediately: the Comunitat Valenciana had cut its transfer-tax rate from 10% to 9% six weeks earlier — most summaries on the internet still say 10%. That find is the changelog\'s first regional entry.',
      'Regional digits live in exactly one data file; every language interpolates the same values — a translation cannot change a number by construction.',
      'Share links are stateless on purpose: the plan is a pure function of the profile, so sharing the profile IS sharing the roadmap. No database, no revocation server — and the trade-offs are written down next to the code.',
      'What did NOT ship is recorded too: school-enrollment windows move every year, so they wait for their own verification pass rather than shipping secondhand.',
    ],
  },
  {
    feature: 'Submission-day hardening',
    date: '12 Jul 2026',
    work: 'The morning of the App Store submission, one more fresh-eyes pass — this time over everything around the app. The contact form got volume limits (a human files a few reports; a flood now gets turned away politely), and two small bugs in it were fixed before any user met them: iOS reports mislabeling themselves as web, and a signed-in visitor\'s email not pre-filling. The store screenshots were regenerated from a retake after the review caught one still showing the retired voice button. And the operational side got its own audit: every third-party service behind the app mapped into one document — who charges money, where the renewal notices go — so nothing expires in an unwatched inbox.',
    decisions: [
      'Guard anything that reaches a human inbox, not just anything that costs API money — the same durable counters now protect the feedback route.',
      'Rate limits run after validation, so malformed junk can never burn the budget legitimate users share.',
      'The working to-do list got the same treatment as the product: everything actionable above the fold, the done history frozen below it — a tracker you have to archaeology through is a tracker you stop trusting.',
    ],
  },
  {
    feature: 'The trust review begins: Lola\'s endpoint, locked to its job',
    date: '13 Jul 2026',
    work: 'Five independent reviewers — each starting cold, from tech, legal, PR, marketing, and operations angles — went over the whole product before launch, and their findings became a fix queue. The first one shipped: the server endpoint behind Lola no longer accepts a caller-supplied instruction prompt. The app now sends only a named task — extract this answer, phrase this question, coach this step, distill this note — and the server writes the actual instructions itself, choosing the model and length limit per task. A copied link can no longer be turned into a free, general-purpose AI proxy; it can only ever run Lola\'s five real jobs. Riding the same deploy: a German homepage headline that had drifted into an awkward idiom ("Damit gehen Sie nach Hause") became the clean line it was meant to be ("Das nehmen Sie mit.").',
    decisions: [
      'The instructions are the security boundary: the client fills only bounded data holes (the answer text, the step title, a slot the server re-looks-up from the catalog by name), never the instructions themselves — so a stolen endpoint stays inside Lola\'s guardrails.',
      'An outside review is worth its discomfort: the sharpest findings were the ones the people closest to the code had stopped seeing. The whole queue is being worked in order, hardest-first.',
      'The prompts moved to one server-side module with a test that pins them to the app\'s five real tasks — the same file the language directive is single-sourced against, so the lockdown can\'t silently drift.',
    ],
  },
  {
    feature: 'The trust review, fully worked: the whole fix queue cleared',
    date: '13 Jul 2026',
    work: 'Every fix the five-seat review raised is now done. Lola stops contradicting the roadmap: one shared validator guards every place the AI can touch your profile, the income question is answered by the engine itself (so a band the plan is about to flag never gets praised), a personal-case question in the final note gets an honest "I can\'t assess that — that\'s for a consulate or a lawyer" instead of a bland "got it," and the opening bubble states plainly that Lola is an AI and this is guidance, not legal advice. The AI endpoint got a Cloudflare human-check (solve once, a short-lived token covers the interview) and a budget-drain alarm. Penalty steps like the Modelo 720 foreign-asset declaration are now kept — flagged "may apply" — when you\'d rather not say, instead of silently vanishing. Share links carry your answers in the URL fragment, which never reaches a server. The national legal figures (the €28,800 income floor and friends) live in one registry, with a test that the prose can\'t drift from it. The income threshold counts your real number of dependents. The privacy policy gained lawful-basis, data-transfer and retention detail. And the home page now shows one real, cited, dated step instead of four abstract trust badges.',
    decisions: [
      'Honesty is a property you can test: nearly every fix shipped with a regression — a garbage profile edit rejected field-by-field, a below-threshold income band that must warn, a declined-assets profile that must still surface Modelo 720, the legal figures that must match their prose.',
      'The paper caught up to the engineering: lawful bases, US-transfer mechanisms (Data Privacy Framework / SCCs) and concrete retention periods are now written down — the trust the code earns, the policy no longer undersells.',
      'Show, don\'t tell: the strongest trust signal isn\'t a badge that says "sourced," it\'s the actual NIE step with its government domain and verified date, pulled live from the catalog so it can never go stale.',
    ],
  },
  {
    feature: 'Pre-launch polish: an account page, a faster arrival question, and a freshness robot',
    date: '13 Jul 2026',
    work: 'A batch of polish before the next mobile build. A proper "My account" page pulls email preferences (turn the weekly roundup on or off), language, and account deletion out of the hamburger menu into one clear place. The interview\'s first question got quick chips — "In a few months," "Later this year," "Next year" — so you can tap a timeframe instead of typing one, with the composer still there for a specific month. The household-scope note ("this maps the main applicant; a working partner runs their own quick interview") now shows in the interview too, not just on the finished roadmap. And a monthly "freshness" robot checks every dated official fact against a staleness deadline and pings every government source URL — so the "last verified" stamps stay honest because a machine makes us keep them.',
    decisions: [
      'The remembering is the machine\'s job: the freshness check fails (and emails) when any statutory figure is past its ~180-day re-verify window or a source URL stops resolving. The human still re-verifies — but nothing rots silently behind a stamp that says otherwise.',
      'A fifth invariant, written down and tested: a catalog change must honor every saved profile, so a replan never triggers a new interview; when new information is genuinely needed, the interview asks only the missing question, never the ones already answered.',
      'The arrival chips reuse the proven date extractor instead of mapping to fixed dates in the app — which would have collided ("in six months" and "next year" landing on the same month depending on today\'s date).',
    ],
  },
  {
    feature: 'The iPhone gets the same human-check — invisibly',
    date: '13 Jul 2026',
    work: 'On the web, one Cloudflare human-check protects the AI endpoint. The phone can\'t show that puzzle without nagging you, so the native app proves it\'s a genuine, unmodified install a different way: Apple App Attest. The moment you open the app, the iPhone\'s Secure Enclave signs a hardware-backed certificate that our server verifies — no tap, no puzzle, nothing you ever see — and on success you get exactly the same short-lived token the web earns from the check. We built the full verifier (it walks Apple\'s certificate chain up to their published root and confirms the signed challenge is fresh and bound to this exact device) and proved it end-to-end against a real attestation captured from the actual build on a physical iPhone.',
    decisions: [
      'The same protection, the right ceremony for each platform: a visible puzzle on the web, an invisible hardware attestation on iOS — both mint the identical server token, so the AI endpoint is guarded everywhere without ever taxing a real user.',
      'Trust the math, verify against reality: the certificate-chain check is hand-written to run on the same Web-Crypto-only server the web uses, and it isn\'t trusted until it verifies a genuine device attestation in the test suite — which promptly caught a one-byte bug that had silently blocked the security check.',
      'Ship dark, flip on purpose: the native path stays switched off behind a flag until the verifier is deployed and deliberately turned on — the safe default is that the phone gets no free pass it hasn\'t earned.',
    ],
  },
  {
    feature: 'First device-testing pass: a smoother start, a fixed confirmation, a skimmable interview',
    date: '13 Jul 2026',
    work: 'Three fixes straight from testing the real build on a phone. The security handshake now happens the moment the interview opens — quietly, while you\'re reading the first question — instead of pausing Lola\'s first reply while it runs. The contact form\'s confirmation email is fixed: it was being sent in a way the phone\'s server quietly discards the instant it replies to you, so senders never got the "we got it" note even though our inbox did; now it\'s sent properly. And Lola\'s messages now put the actual question in bold, so you can skim the reasoning and still see what\'s being asked.',
    decisions: [
      'The gate should never be felt: the honest fix wasn\'t to weaken the check but to run it earlier, hidden behind something you\'re already doing (reading the greeting) — the same trick good apps use to make loading disappear.',
      'A dropped confirmation is a bug even when nothing errored: the report always arrived, so it looked fine — but the sender got silence. It earned a regression test that fails if the confirmation is ever sent the fire-and-forget way again.',
      'Emphasis without new copy: the bubbles were already written as "context, then the question," so bolding the question was a rendering choice, not a rewrite — the words are identical, just easier to scan.',
    ],
  },
  {
    feature: 'Testing ends, the release candidate goes out — with over-the-air fixes wired in',
    date: '13 Jul 2026',
    work: 'The call was made to stop hunting for bugs internally and let real users be the test: the App Store release-candidate build was cut and sent to review. Before cutting it, the app gained over-the-air updates — future fixes to the app\'s logic and copy reach installed phones on next launch, without a new App Store review each time. The Android track also moved: a test device is in hand, and the launch playbook was re-checked, catching that Android would need its own hardware "this is a real install" proof (the sibling of the iPhone\'s App Attest) before its first test build — otherwise the interview would ship dead on Android.',
    decisions: [
      'Internal testing has diminishing returns past a point: two expert testers going a full evening without a find means the next thousand bugs belong to strangers — and the monitoring, regression-test discipline, and now OTA updates exist precisely to absorb them fast.',
      'Update compatibility is fingerprinted, not versioned by hand: an over-the-air fix mathematically cannot land on an app binary whose native internals don\'t match it.',
      'Playbooks get re-read before they\'re executed: the Android guide was written before the endpoint lockdown existed; replaying it against today\'s code surfaced a step that would have shipped a broken interview to twelve testers.',
    ],
  },
  {
    feature: 'The human-check gets a visible fallback — found by watching two real strangers fail',
    date: '15 Jul 2026',
    work: 'Error monitoring caught two real visitors — one in Barcelona, one in Slovakia, both arriving through Facebook links — whose interview silently died: every answer waited 20 seconds, then failed. The cause: inside Facebook\'s built-in browser, the invisible "prove you\'re human" check decides it needs the person to actually click something — but the widget was rendered off-screen, where nobody can click it. Now, when the invisible check can\'t pass, a small visible "quick security check" appears once, the person taps it, and the interview continues where it left off. The wait before that fallback dropped from 20 seconds to 8, a browser that has failed once skips straight to the visible check on later turns, and the fix carries five new regression tests.',
    decisions: [
      'The security gate stays; it grows a door. Weakening the human-check for awkward browsers would reopen the abuse hole it exists to close — the honest fix is to let a real human prove themselves visibly when the invisible path can\'t.',
      'In-app browsers are the front door, not an edge case: people arrive from a Facebook or Instagram post inside those apps\' built-in browsers, so "works in Safari and Chrome" isn\'t the bar — the timing of both failures matched the 20-second timeout to the millisecond, which is what pinned the cause.',
      'Two errors can matter more than two thousand: the event count was tiny, but both were real people from the exact channel the growth plan leans on next — monitoring earns its keep by catching the failures that would otherwise be invisible refusals.',
    ],
  },
  {
    feature: 'Apple\'s first verdict: rejected — for advertising the rival store',
    date: '21 Jul 2026',
    work: 'Eight days after submission, Apple reviewed the app and rejected it on exactly one point: the home screen\'s "coming soon" pill for the other major app store. Their rule (Guideline 2.3.10) is that an iOS app may not carry references to third-party platforms, and the app renders the same landing page the website does — store-availability band included. The fix: that band is now web-only; inside an installed app it was redundant anyway ("download our app" is a strange thing to tell someone already inside it). One platform gate, a regression test so no rival-store copy can quietly return to a native build, and the corrected build heads back to Apple.',
    decisions: [
      'Fix rejections at the root, again: no appeal, no reworded pill — the band simply doesn\'t belong inside the binary, so it\'s gone from it.',
      'Sharing one codebase across web and native means every marketing surface needs a "who is this for?" check — the store band was written for a browser visitor and shipped to the phone unexamined.',
      'Every bug that reaches a person earns a regression test — including when the person is Apple\'s reviewer.',
    ],
  },
  {
    feature: 'Approved — Get Camino is live on the App Store',
    date: '25 Jul 2026',
    work: 'Twelve days and four review rounds after the first submission, Apple approved the app — and the release button was pressed the same morning. After the rival-store pill, the dialogue continued in writing: Apple asked whether the AI is built in-house and where users consent to it (answered plainly: the conversational layer is a leading AI provider, every step and date decision is our own deterministic engine, only conversation text ever leaves — no names, no emails — and Lola\'s first bubble discloses all of it). Then a screenshot caption containing the word "free" was ruled a price reference (one caption reworded), alongside a questionnaire about paid subscriptions the app doesn\'t have (answered: nothing is for sale). Round four passed without a word. Approval waited behind a manual-release switch until this morning; the iPhone app is now downloadable worldwide — except the EU storefronts, which unlock when a pending business-identity verification with Apple completes. The web app serves everyone, Spain included, meanwhile.',
    decisions: [
      'Answer reviewers in writing before changing code: across three content rounds, the only change the whole dialogue actually demanded was one word in one screenshot caption — everything else was resolved by stating the facts.',
      'Release is a chosen moment, not a side effect: manual release meant approval could sit until the launch was ready to be deliberate.',
      'The reviewer is a user too: monitoring caught their sign-in failing on a device with no iCloud account — recognized, ruled harmless, and left on watch rather than chased, the same triage discipline real users get.',
    ],
  },
  {
    feature: 'The honest placeholder pays off: the App Store badge becomes a real link',
    date: '26 Jul 2026',
    work: 'Last month the home page promised "no official store badge appears until there\'s a real listing behind it — swapping in the link is a one-line change when the apps ship." The day after launch, that line was paid: the App Store pill now says "Download on the App Store" and actually downloads the app, while Google Play keeps its honest "coming soon." The band\'s copy was rewritten in all five languages for the true half-way state — the iPhone app is here, the browser still does everything, Android is next, and the EU storefronts unlock soon.',
    decisions: [
      'The component was designed for exactly this moment: each store\'s pill flips independently when its listing URL exists, so a half-launched reality never has to round up to a lie.',
      'The pre-written "live" copy claimed "on iPhone and Android" — written for the end state, wrong for today. Copy describes the world as it is, per store, per sentence.',
      'The listing URL was verified resolving via Apple\'s own lookup API before the link shipped — a download badge that 404s is worse than a coming-soon pill.',
    ],
  },
  {
    feature: 'Android reaches a real device — the interview works from the first build',
    date: '31 Jul 2026',
    work: 'The Android app cleared its hardest gate. Play Integrity — the sibling of the iPhone\'s hardware install-proof — now verifies a genuine Google Play install and mints the short-lived token the interview needs, confirmed on a physical phone (Lola answered). The first production build went up to Google\'s internal testing track through a one-command automated pipeline, installs cleanly, and runs. Android will ship phone-only, matching the iPhone. And an invitation for Android testers was built into the site itself — shown only to Android visitors — so the closed test recruits from people actually moving to Spain, not a rented crowd.',
    decisions: [
      'Prove the security path on a real Play install before recruiting anyone: Play Integrity only returns real verdicts for a genuine Google Play download, so the first install doubled as the proof, on a real device.',
      'Recruit testers from the site\'s own Android visitors, never a paid tester farm — real target users catch real bugs, and the farms are a policy landmine that can burn the account.',
      'Phone-only for Android, like the iPhone: a moving-to-Spain checklist is a phone product; it drops the tablet burden and stays reversible.',
    ],
  },
  {
    feature: 'The Android closed test is submitted — and tester recruitment opened',
    date: '31 Jul 2026',
    work: 'Everything Google needs to start the two-week closed test is now in and submitted for review. Phone screenshots were captured on a real Android phone and framed to the brand — with a purpose-built renderer that keeps them inside Google\'s exact size rules (a raw phone screenshot is actually too tall to accept, and just under the resolution that qualifies for promotion). The store listing was finished (category, contact), and the verified build was promoted to the closed track — reused, not rebuilt, because Google refuses a re-uploaded version number. And the Android-visitor invitation on the site went live: it points to a short form to leave an email, so we collect testers first, then enrol them.',
    decisions: [
      'Promote the already-verified build to the closed track rather than submit a fresh one — the same version number can\'t be uploaded twice, and reusing it keeps the exact binary that passed the security proof on a real phone.',
      'Frame screenshots to 16:9 and past the 1080px bar on purpose: it clears both the "too tall to accept" rejection and the "eligible for promotion" threshold in one shot.',
      'Recruit by collecting emails through a contact form, not a self-serve group link: a business-domain Google Group can\'t admit outside members without an org-wide security change, so a form is the honest path for a dozen testers.',
    ],
  },
  {
    feature: 'A move-cost estimate — built, and gated off until every figure is checked',
    date: '31 Jul 2026',
    work: 'The roadmap already knows which steps apply to you and when they\'re due — this adds what each one costs, answering the question every mover asks. A researched pass priced all 73 catalog steps and sorted them four ways: fixed official fees (a set government tasa — the exact euro), costs that scale with a number only you know (property transfer tax as a percent of your home price), personal costs we won\'t put a figure on (a scouting trip, a lawyer — your budget, not ours), and steps that cost nothing (kept, but folded away). It reads as three honest layers behind a new "Costs" tab, with the total always a range, never false precision. It ships switched OFF behind a flag: the fixed government fees have since been checked one by one against their official source (the 2026 BOE tasas order, Instituto Cervantes, the DGT and Seguridad Social schedules) and now show "verified"; the percentages and market prices stay honest "estimates" until they\'re checked too.',
    decisions: [
      'Split every cost by how honestly we can state it — a fixed law, a percentage of your number, or your own call — so the interface never blends a sourced fee with a guess.',
      'The total is a range, and personal costs stay yours: we won\'t fold a guessed lawyer\'s fee into a number that looks authoritative.',
      'Ship it off behind a flag and prove the data first — the same playbook as the phone security work: build the surface, verify every figure against its government source, then turn it on.',
    ],
  },
  {
    feature: '“When should I land?” — a timeline that shows the hidden tax-year trap',
    date: '31 Jul 2026',
    work: 'A second view that answers a question a checklist never can: when to arrive. Pick an arrival month and your real roadmap re-computes — every deadline shifts with it — because the plan engine already dates everything relative to your arrival. The payoff is a rule almost no one sees coming: Spain treats you as a tax resident for a whole calendar year only if you spend more than 183 days in it, so landing a few weeks either side of early July changes which year Spain first taxes you — and moves your first Spanish tax return by a full year. The screen computes that from your arrival date and says it plainly. Two honesty lines held: the milestone dates that are still estimates stay marked, and school-enrollment windows show as a flag (“ordinary window” vs off-cycle “fuera de plazo”), never a made-up date — because those windows change yearly and we won’t ship them secondhand.',
    decisions: [
      'The simulation is a diff of two real engine runs, not new logic — the deadlines you already trust, shifted; nothing invented.',
      'Surface the 183-day rule as the calendar-year it actually lands in — that’s the insight people pay a gestor to notice.',
      'Resist modelling school windows precisely: keep them a flag, which is what keeps the feature both honest and cheap.',
    ],
  },
  {
    feature: 'A fresh-eyes pass on the two new views — fixing what the honesty rule caught',
    date: '31 Jul 2026',
    work: 'Before real testers arrived, a cold read of the just-shipped Costs and Timing code found a handful of things worth fixing. The tax-residency pivot was off by a day: the rule is MORE than 183 days, so the last arrival that still counts is 1 July, not 2 — corrected in the engine and the copy. The timeline\'s milestone dates were built at midnight UTC but printed in the reader\'s own timezone, so a 1 July arrival showed as “Jun 30” for anyone in the Americas while the headline said July — now printed consistently. The tax card stated residency as a certainty; it now carries a one-line caveat that it assumes you actually stay past 183 days. On the Costs side, the “Fixed fees” total quietly mixed government-checked fees with two nationality-dependent estimates — those estimates now stay in the range but out of the number we present as certain — and a buyer who hasn\'t entered a home price yet gets told why the total looks low instead of being misled.',
    decisions: [
      'The honesty invariant applies to arithmetic too: “more than 183 days” means 184, and a one-day-too-generous boundary is still a wrong deadline.',
      'A date is a fact — render it in one timezone end to end, or two parts of the same screen will disagree.',
      'Only sum into a figure labelled “fixed” the costs that are actually fixed and checked; let honest estimates ride the range with their “estimate” tag.',
      'Every fix earned a regression test in the layer that owns it — the boundary, the date construction, and the fees split are all pinned now.',
    ],
  },
  {
    feature: 'A date bug that only showed up an ocean away — found and fixed',
    date: '1 Aug 2026',
    work: 'The fresh-eyes pass had flagged one thing to come back to: the same one-day timezone slip it caught in the new timeline probably ran through the whole app. It did. Every date in the app is stored as midnight UTC, but the roadmap, the printable report, and the weekly email printed those dates in the reader\'s own timezone — so anyone west of Britain (most of the Americas) saw every deadline a day early, and a step due today could read as already overdue. It never surfaced in testing because it\'s invisible anywhere at or east of London — which is exactly where the app is built and where the automated tests run. The fix makes the whole engine read and write dates one consistent way, midnight UTC end to end, and the new regression test deliberately pretends to be in Los Angeles so this exact bug can never hide behind the timezone the machine happens to sit in.',
    decisions: [
      'A bug that\'s invisible in your own timezone is the dangerous kind — the test now forces a US-West clock so it can\'t pass just because the machine is in Europe.',
      'Pick one convention and hold it everywhere: dates are built and read as midnight UTC, and every screen prints them the same way — no surface left to drift on its own.',
      'The same slip, first spotted on one screen, was chased to its root across the whole engine rather than patched only where it showed.',
    ],
  },
  {
    feature: 'A tester bug bash tightens the small screens — nothing gets clipped',
    date: '9 Aug 2026',
    work: 'With real testers now running the Android closed test, the first bugs they found were all about the same thing: content squeezed off the edge of a phone. On the roadmap the row of view tabs (This week / Full roadmap / Costs / Timing) plus the PDF and Share buttons was crammed onto one line, so on a narrow screen the Share button was clipped and — worse on Android, where the system font runs wider — the whole right side vanished. And during the interview, the last row of answer chips could hide behind Android\'s on-screen navigation bar. The fix splits the roadmap controls into two rows: the view tabs now swipe sideways in their own scroller so they never clip no matter the language, and PDF/Share get their own always-visible line beneath. The interview now pads its answers by the exact height of the device\'s bottom navigation bar, so the last chip always clears it.',
    decisions: [
      'The people testing the app find the bugs the builder can\'t — the builder\'s screen is never the smallest one, and never has Android\'s gesture bar in the way.',
      'Ship the fix as an over-the-air update: it\'s all layout, so testers get it automatically on next open, and it never disturbs the 14-day closed-test clock.',
      'Design for the tightest case on purpose — swipeable tabs and safe-area padding mean long translations and edge-to-edge Android screens can\'t reintroduce the clip.',
    ],
  },
  {
    feature: '🎉 Get Camino is live on Google Play',
    date: '22 Aug 2026',
    work: 'The Android app cleared Google\'s review and went live on the Play Store worldwide (all 177 countries), joining the iPhone app and the web. It came after the full closed-testing gauntlet — a dozen real testers running the app for two continuous weeks — and Google\'s production-access review. The first production submission was rejected: a reviewer opened the optional "Sign in" screen and treated it as a required login wall, even though the entire app (interview, roadmap, costs, timing, sharing) works with no account. The fix was to state that plainly in the store\'s reviewer-access declaration — no sign-in required, plus step-by-step instructions to reach every feature without one — and resubmit. Google approved it on the next pass and auto-published it.',
    decisions: [
      'Tell the reviewer the truth instead of faking a demo login: the honest declaration ("no account needed, here\'s how to use it") is backed by the actual code — the interview saves locally and the roadmap renders with no signed-in user — so no fabricated credentials were ever submitted to Google.',
      'Verify the claim before declaring it: a fresh read of the auth flow confirmed sign-in is genuinely optional and dismissible before writing a single word to the declaration.',
      'Reuse the tester-vetted build, don\'t rebuild: production shipped the exact binary the closed testers ran, so there were no new surprises and no extra build cost.',
    ],
  },
  {
    feature: 'A public /status page — live health of the whole stack',
    date: '7 Sep 2026',
    work: 'A new public page at /status shows whether Camino and its dependencies are up (app, authentication, database), green/red, auto-refreshing every 30s. It is fed by a new GET /api/status endpoint that probes each live dependency in parallel (with per-check timeouts) and returns HTTP 503 if any critical one is down, 200 otherwise. The endpoint checks whatever Supabase the app is actually pointed at (reads EXPO_PUBLIC_SUPABASE_URL), so it follows a backend migration automatically. Pure decision logic (is-the-product-up, and what HTTP code an uptime monitor should see) lives in lib/status.ts with unit tests; the route does the I/O and the page does the rendering.',
    decisions: [
      'One endpoint, whole stack: a status check that 503s on any critical failure lets a single uptime monitor cover everything — which matters because the monitoring provider\'s free tier allows only one monitor. No per-service monitor sprawl.',
      'Check what the app actually uses, not a hardcoded host: reading the app\'s own Supabase URL means the status page stays truthful across backend changes with zero edits.',
      'Public on purpose: in the same show-our-work spirit as the changelog, an open status page is a small honesty signal — and a useful one for anyone (including a future buyer) checking whether the thing is alive.',
      '"Reachable" vs "healthy" per check: the database probe treats any non-5xx as up (401/403 still prove it\'s serving), while auth requires a real 200 — so a check is neither falsely green nor falsely red.',
    ],
  },
  {
    feature: 'The backend moved to infrastructure we run — $0, and it never sleeps',
    date: '7 Sep 2026',
    work: 'The database and sign-in moved off the managed hosting\'s free tier onto a small always-free cloud server we run ourselves. The trigger: the free tier auto-paused after about a week of low activity — and keep-alive pings never satisfied its rule — which is the wrong behaviour for a tool people return to over months of a move; the paid tier was poor value at this traffic. The full stack (Postgres, authentication, storage, API gateway) now runs on that server behind auto-renewing TLS, at no monthly cost, on the same public API address as before. Every account and every saved roadmap came across, and all three sign-in methods (Apple, Google, email) were wired and tested against the new box before the app was pointed at it.',
    decisions: [
      'Own the uptime floor: a backend that goes to sleep after a quiet week is a real failure for a months-long planning companion — self-hosting removes the pause entirely and costs nothing, chosen over a paid managed plan that solved the symptom at a price the traffic didn\'t justify.',
      'Flip behind a rollback: the old managed backend was left intact and one config change away the whole time, so the migration was reversible at every step; the switch was three environment variables plus a redeploy and an over-the-air update.',
      'Verify each path before trusting it: every sign-in method and a real roadmap read/write were exercised against the new server first. The one bug that slipped through — the imported database\'s API schema cache was stale, so roadmaps briefly wouldn\'t load even though sign-in worked — was diagnosed and fixed the same hour.',
      'Honest cost: a backend swap resets active sessions, so people signed in once more afterward — but no roadmap was lost, and the trade for a backend that never sleeps was worth naming rather than hiding.',
    ],
  },
  {
    feature: 'Hardening the self-run backend: protected server, backups off the box, test environment retired',
    date: '8 Oct 2026',
    work: 'The cloud account behind the server came off its free trial, which left the always-free server exposed to the provider\'s rule that reclaims idle free machines. Moving the account to pay-as-you-go removes that rule, and the server still costs nothing because it stays inside the always-free limits. A $1 monthly budget alarm emails on the first cent of spend, so a stray paid resource can\'t run up a bill quietly. The daily database backups, which had lived only on the server, are now also copied off it every day and checked on arrival: valid archive, users and roadmaps present, and an alert if the newest copy is stale. Finally, the old managed test environment, which had been down for a month, was retired rather than revived. Production deploys never depended on it, and its keep-alive job was only sending failure emails.',
    decisions: [
      'Pay for protection, not for compute: pay-as-you-go exists here only to switch off idle reclamation. The budget alarm makes the trade safe, because the expected bill is $0 and any spend at all is a signal.',
      'A backup on the same disk is not a backup: the off-box copy verifies each dump\'s contents, not just that a file arrived, and alerts loudly on a failed pull or a stale copy.',
      'Match the infrastructure to the stage: the product is in keep-the-lights-on mode, so a second always-on test environment was cost and upkeep without a user. The tests that needed it are documented as dormant, not deleted, so they come back if staging does.',
    ],
  },
  {
    feature: 'Closing out the old hosted backend, and a private backend for development',
    date: '19 Oct 2026',
    work: 'Six weeks after the move to a self-run server, the old managed database projects were deleted, both the production copy kept as a fallback and the retired test environment. With them went the daily job that kept the old production database awake; from the next day it would only have reported failures. Development now runs against a private copy of the backend on the developer\'s own machine, started from a versioned schema in the repository, so working on the app never needs a shared server and can never touch real data. The database schema had previously lived only inside the hosting dashboards. It is now written down in the code, and a probe confirmed that a person can save and reload a roadmap, cannot grant themselves staff access, and cannot see anyone else\'s data.',
    decisions: [
      'Retire the fallback once it is no longer one: the old production copy had not taken a write since the move, so restoring it would have lost six weeks of roadmaps. The real recovery path is the self-run server\'s daily, off-site, checked backups.',
      'Development data stays on the developer\'s machine: the test-account tool now refuses any database that is not local, which is stricter than the old rule of trusting one named test project.',
      'Write the schema down: a table that exists only in a dashboard disappears with the dashboard. The schema was first rebuilt by hand, then replaced the same day with an exact export from the live server.',
    ],
  },
  {
    feature: 'One home for every account: the studio organization',
    date: '19 Oct 2026',
    work: 'The services Camino depends on had grown up under several personal and product logins. They now live under one studio organization, MadFiddlerLabs, with Camino as a named project inside each: the code repository, the app-build service, error reporting, the bot check on the interview form, and the email service. The code was updated to match: the build configuration names the new owner and error-reporting project, the error reports go to the new address, and the bot check uses a widget in the studio account. Before changing anything, a test message was sent to both the old and the new error-reporting address to confirm that neither would drop reports during the switch.',
    decisions: [
      'One owner per service: a single login per service, owned by the studio, replaces logins scattered across mailboxes that are being retired.',
      'Test before cutting over: sending a test event to both addresses proved the old one still delivered, so the switch could ship with an ordinary deploy rather than as an emergency.',
      'Move email in one sitting: a sending domain can only live in one account, so mail was down from the moment it left the old account. The new records, the new key in both the app and the sign-in server, and a test delivery all happened in the same session, before the weekly email was next due.',
      'Hand over before letting go: the search-listing and sign-in accounts were added to the studio owner and confirmed working before the personal owner was removed, so neither was ever left without someone in charge. The old owner\'s verification file came off the website last, in an ordinary deploy on 20 Oct.',
    ],
  },
  {
    feature: 'Counting visitors without cookies, properly',
    date: '20 Oct 2026',
    work: 'The website\'s analytics had been cookieless since July, but the way it was done counted every page load as a new visitor, so visitor numbers were inflated and nobody could be followed through a visit. It now uses the analytics provider\'s cookieless mode, the standard for every studio product: the provider\'s server turns the visitor\'s IP address and browser type into a one-way code that changes daily, then throws the IP address away. Still nothing is stored on the visitor\'s device and there is still no consent banner. The privacy policy now says this in plain words.',
    decisions: [
      'Turn the server side on first: the provider ignores cookieless events from a site whose project setting is off, so the setting went on before the code shipped.',
      'Keep linking signed-in visits: people with an account are still recognised by their account ID, which only arrives after they sign in, because that is the only way to see whether account holders come back. Anonymous visitors are counted once per day they visit, never followed across days.',
      'Accept the losses: these events no longer carry a rough location or the provider\'s automatic bot flag, so bot traffic has to be filtered by hand.',
    ],
  },
  {
    feature: 'A new home for the website',
    date: '21 Oct 2026',
    work: 'The website and the small server behind it moved from the app-build service\'s hosting to Cloudflare\'s, under the same studio account that already ran the bot check. The app-build plan that included custom web addresses was cancelled to cut costs, and the free tier cannot serve getcamino.app. The pages are now plain files served from Cloudflare\'s network, and only the parts that need code (the interview, sign-in helpers, email links, the status check) run as a small program. The domain\'s address book moved to Cloudflare too, record for record, so email and sign-in never noticed. The iPhone and Android apps needed no update: they talk to getcamino.app, wherever it lives.',
    decisions: [
      'Same engine, new building: the old host already ran on Cloudflare\'s technology, so the server code moved unchanged and the risk stayed low.',
      'Prove it before pointing at it: the new host ran on a test address first, with the full test suite, every page in the sitemap, a real interview turn and a contact-form email, before the domain moved.',
      'One place for secrets: the keys stay in the app-build service, and every deploy copies them to the new host, so changing a key never means remembering a second place.',
      'Copy the address book exactly: every DNS record was checked to answer identically from the new provider before the switch, so mail and sign-in kept working through it.',
    ],
  },
  {
    feature: 'Version 1.0.1 in both app stores',
    date: '27 Oct 2026',
    work: 'The first store update since launch went to Google Play and the App Store together. It brings the Costs and Timing tabs to the phones, and a fix for an Android phone where Lola\'s first reply could spin forever. Before Lola answers, the app proves it is a genuine install, and that check had no time limit: one stalled call left the spinner up with no request ever sent. The check now gives up after 15 seconds and Lola shows her normal retry message. While the update waited for review, an Apple test iPhone ran it and its genuine-install check never answered, so Lola showed that retry message. The same build on a real iPhone worked, Apple approved it, and the time limit is what turned an endless spinner into a clear error.',
    decisions: [
      'Cap the whole check, not each step: one 15-second limit covers the full exchange, so no single slow call can hold the interview hostage.',
      'Fail into the normal error, never a bypass: a timed-out check sends Lola no proof, the server refuses, and the user gets the same retry message as any other hiccup.',
      'Check the alarm before acting on it: the error report named the new iPhone build, so we traced it to Apple\'s test device and reproduced the flow on a real phone before deciding not to pull the release.',
      'One release for both stores: the Android build that had already passed the internal test went to production unchanged, and the iPhone build carried the same code.',
    ],
  },
  {
    feature: 'A canceled step is a choice, not a crash',
    date: '29 Oct 2026',
    work: 'Two error alerts in two days turned out to be people changing their minds. On the iPhone, closing Apple\'s sign-in sheet showed a "sign-in failed" message and raised an alarm, because the cancel arrived without the label the app was checking for. On the web, a visitor tapped Cancel on the security check that Lola needs before she answers, and the refused request raised another alarm. Both now end quietly: a closed Apple sheet does nothing, and a canceled security check shows Lola\'s normal retry message without sending a request that is bound to fail.',
    decisions: [
      'Count choices separately from failures: alarms are for things that broke. A person backing out of a step is normal, and paging on it would train us to ignore the alarm.',
      'Match the cancel two ways: the Apple cancel is recognized by its documented code or by the library\'s fixed message, so a missing label can\'t turn it back into an error.',
      'Keep every real failure loud: only an explicit Cancel is silenced. A security check that errors or never loads still reaches the server, and its refusal still raises an alarm.',
      'Still count the cancels: analytics records each canceled security check, so we would see if the check started driving people away.',
    ],
  },
];

export default function BuildLogScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.scroll}>
      <Seo
        title="The Get Camino build log — every feature, dated, with decisions"
        description="Every major piece of Get Camino in the order the work happened: what shipped, when, and the decisions that shaped it."
        canonical="https://getcamino.app/how-i-was-built/log"
      />
      <NavBar />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>HOW I WAS BUILT — THE RECEIPTS</Text>
        <Text style={styles.title}>The build log</Text>
        <Text style={styles.dek}>
          The essay tells the story; this is the homework. Every major piece of Get Camino — newest
          first — with what shipped and the decisions that shaped it.
        </Text>
        <View style={styles.linksRow}>
          <TouchableOpacity onPress={() => router.push('/how-i-was-built')}>
            <Text style={styles.backLink}>← Read the essay</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openExternal('https://github.com/MadFiddlerLabs/camino-app')}>
            <Text style={styles.backLink}>The code on GitHub ↗</Text>
          </TouchableOpacity>
        </View>

        {/* Data stays chronological (it reads as history in code); display is newest-first
            (user request 2026-07-04 — the log got long). Numbers stay chronological, so the
            top entry carries the highest number of the running series. */}
        {ROWS.map((row, i) => ({ row, n: i + 1 })).reverse().map(({ row, n }) => (
          <View key={n} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowNum}>{String(n).padStart(2, '0')}</Text>
              <Text style={styles.rowFeature}>{row.feature}</Text>
              <Text style={styles.rowDate}>{row.date}</Text>
            </View>
            <Text style={styles.label}>WORK COMPLETED</Text>
            <Text style={styles.work}>{row.work}</Text>
            <Text style={styles.label}>KEY DECISIONS</Text>
            {row.decisions.map((d, j) => (
              <Text key={j} style={styles.decision}>– {d}</Text>
            ))}
          </View>
        ))}

        <Text style={styles.outro}>
          Still being written — the log grows as the work does.
        </Text>
      </View>
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:     { flex: 1, backgroundColor: palette.cal },
  content:    { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  eyebrow:    { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, letterSpacing: 1.5, color: palette.amber, marginBottom: 10 },
  title:      { fontFamily: 'Fraunces_600SemiBold', fontSize: 40, lineHeight: 46, color: palette.indigo, marginBottom: 12 },
  dek:        { fontFamily: 'HankenGrotesk_400Regular', fontSize: 17, lineHeight: 26, color: palette.indigo, marginBottom: 10 },
  linksRow:   { flexDirection: 'row', gap: 20, flexWrap: 'wrap', marginBottom: 28 },
  backLink:   { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 14, color: palette.cobalt },

  row:        { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E4DC', borderRadius: 14, padding: 20, marginBottom: 14 },
  rowHeader:  { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 10 },
  rowNum:     { fontFamily: 'Fraunces_600SemiBold', fontSize: 15, color: palette.amber },
  rowFeature: { fontFamily: 'Fraunces_600SemiBold', fontSize: 20, color: palette.indigo, flexShrink: 1 },
  rowDate:    { fontFamily: 'HankenGrotesk_400Regular', fontSize: 12, color: palette.muted, marginLeft: 'auto' },
  label:      { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 10, letterSpacing: 1.2, color: palette.muted, marginTop: 10, marginBottom: 4 },
  work:       { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, lineHeight: 21, color: palette.indigo },
  decision:   { fontFamily: 'HankenGrotesk_400Regular', fontSize: 14, lineHeight: 21, color: palette.indigo, marginBottom: 4 },

  outro:      { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: palette.muted, marginTop: 14, fontStyle: 'italic' },
});
