import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { palette } from '@/constants/Colors';
import Seo from '@/components/Seo';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

// The product roadmap — the outward-facing twin of TODO.md's "Product roadmap" section.
// Public since 3 Jul 2026 (user decision): linked from the nav menu and in the sitemap; companion
// to the build story (how it got here) and the build log (the receipts).
//
// ⚠️ MAINTENANCE CONTRACT: update this page AND /how-i-was-built/log with EVERY PR, so what we
// tell users matches what we actually shipped. Source of truth is TODO.md's roadmap section —
// this page is its user-readable rendering (no internal jargon, honest about what we're NOT
// building and why).

type Item = { title: string; note?: string; date?: string };
type Section = { h: string; intro?: string; items: Item[] };

const UPDATED = '19 October 2026';

const SECTIONS: Section[] = [
  {
    h: 'Just shipped',
    items: [
      { title: 'Old hosted backend retired', date: '19 Oct 2026', note: 'The managed database projects that Camino used before moving to its own server have been deleted. Your roadmap was not on them: it has lived on the self-run server since September, which keeps daily backups off-site. Behind the scenes, development now runs against a private local copy of the backend, so building new features never touches real data. Nothing changes for you.' },
      { title: 'Backend hardening: protected server and off-site backups', date: '8 Oct 2026', note: 'Two safeguards for the server that stores your roadmap. First, the cloud account it runs on moved off its free trial onto pay-as-you-go, which stops the provider from ever reclaiming the server for being quiet. It still costs nothing, and a budget alarm fires on the first cent of spend. Second, the daily database backups no longer live only on the server itself: a copy leaves the server every day and is checked on arrival, so a lost disk can no longer take the backups with it. Nothing changes for you; this is the plumbing getting sturdier.' },
      { title: 'A faster, always-on backend — moved in-house', date: '7 Sep 2026', note: 'The behind-the-scenes services that store your roadmap and handle sign-in moved onto infrastructure we run ourselves. Why: the previous managed host would put the database to sleep after a quiet week, which is the wrong behaviour for a tool you come back to over months of planning a move. It now runs on an always-on server at no monthly cost, behind the same secure web address as before. Everything came across — every account and every saved roadmap — and all three ways to sign in (Apple, Google, email) work exactly as before. The one thing you may have noticed: a move like this resets active sessions, so you might have been asked to sign in once more — your roadmap was waiting for you the moment you did.' },
      { title: 'A public status page — is everything up?', date: '7 Sep 2026', note: 'There is now a live status page at getcamino.app/status that shows, in plain green/red, whether Camino and the services it runs on are healthy — the app, sign-in, and the database — refreshing itself every 30 seconds. Behind it, a single endpoint checks every piece the live product depends on and reports the whole thing as "down" if any critical part fails. That one endpoint doubles as the target for an automated uptime monitor, so a problem anywhere in the stack raises an alert — and because the check follows whatever backend the app is pointed at, it keeps working as the plumbing changes underneath. It is public on purpose: the same "show our work" honesty as the public changelog.' },
      { title: '🎉 Get Camino is live on Google Play', date: '22 Aug 2026', note: 'The Android app cleared Google\'s review and is now on the Play Store worldwide, alongside the iPhone app and the web. Getting here meant running the full closed-testing gauntlet first — a dozen real testers using the app for two continuous weeks — then Google\'s production-access review. The first production submission was rejected on a misunderstanding: a reviewer opened the optional "Sign in" screen and took it for a required login wall, when in fact the whole app — interview, roadmap, costs, timing, sharing — works with no account at all. Rather than invent a fake demo login to smooth it over, we told Google\'s reviewers exactly how the app works, in writing: no sign-in is needed, and here is how to reach every feature without one. They approved it on the next pass. Free, worldwide, no account required — the same promise as always, now on both app stores.' },
      { title: 'Tester bug bash: nothing gets clipped on a small screen', date: '9 Aug 2026', note: 'The Android closed test is live, and the first things real testers found were all the same shape — content squeezed off the edge of a phone. On the roadmap, the view tabs (This week / Full roadmap / Costs / Timing) plus the PDF and Share buttons were crammed onto one line, so the Share button was clipped — and worse on Android, where the system font runs wider, the whole right side disappeared. During the interview, the last row of answer chips could hide behind Android\'s on-screen navigation bar. The roadmap controls now sit on two rows: the tabs swipe sideways in their own scroller so they never clip in any language, and PDF/Share get their own always-visible line. The interview pads its answers by the exact height of the phone\'s bottom nav bar so the last chip always clears it. It shipped over-the-air — pure layout, no new store build, no disruption to the running 14-day test.' },
      { title: 'A one-day date slip, fixed across the whole app', date: '1 Aug 2026', note: 'The fresh-eyes pass had noted a timezone slip worth chasing to its root — and it ran deeper than one screen. Every date in the app is kept as midnight UTC, but the roadmap, the printable report, and the weekly email were printing them in the reader\'s own timezone, so anyone in the Americas saw every deadline a day early — and a step due today could look overdue. It stayed hidden because it only appears west of Britain, and both the developer\'s machine and the automated tests sit in Europe. Now the whole app handles dates one consistent way end to end, with a regression test that pretends to be in Los Angeles so the bug can never slip back in behind a friendly timezone.' },
      { title: 'A cold read of the two new views — and the fixes it found', date: '31 Jul 2026', note: 'Before real testers weighed in, a fresh-eyes pass over the just-shipped Costs and Timing code caught a handful of honesty details worth fixing. The tax-residency tipping point is one day earlier than first written — the rule is more than 183 days, so 1 July is the last arrival that still counts, not 2 — corrected in the engine and the wording. The timeline\'s dates now print in a single timezone, so a July arrival can no longer read as June for someone in the Americas. The tax card now says out loud that it assumes you actually stay past 183 days. And the "Fixed fees" total no longer blends government-checked fees with nationality-dependent estimates — those ride the range with their "estimate" tag instead — while a buyer who hasn\'t entered a home price yet is told why the total looks low. Each fix earned a regression test.' },
      { title: '🎉 Get Camino is live on the App Store', date: '25 Jul 2026', note: 'Apple approved the app after four review rounds — the first flagged a rival-store mention (fixed same day), the next two were answered in writing (how the AI works and where users consent; a screenshot caption\'s "free" reworded), and the fourth passed clean. Released this morning: the iPhone app is downloadable worldwide, except the EU storefronts, which unlock once a pending business-identity verification with Apple completes — the web app serves everyone, Spain included, meanwhile.' },
      { title: 'Apple\'s first review came back — one fix, resubmitted', date: '21 Jul 2026', note: 'Apple reviewed the app and rejected it on a single point: the home screen still showed the website\'s "coming soon" pill for the other major app store, and App Store rules don\'t allow references to rival stores inside an iOS app. Fair enough — inside an installed app that band was redundant anyway. It\'s now web-only, a regression test makes sure no rival-store copy can sneak back into a native build, and the corrected build heads back into Apple\'s queue.' },
      { title: 'The human-check works inside Facebook\'s browser now', date: '15 Jul 2026', note: 'Error monitoring caught two real visitors — arriving through Facebook links, inside Facebook\'s built-in browser — whose interview silently failed: that browser gets the strict version of the "prove you\'re human" check, which our invisible widget could never let them answer. Now, when the invisible check can\'t pass, a small visible "quick security check" appears once, you tap it, and the interview picks up where you left off — in all five languages, with regression tests. This is the real-users-as-testers loop doing its job: two errors, both from the exact channel we\'re about to grow on, fixed before the channel opens.' },
      { title: 'The release candidate is out — with over-the-air fixes wired in', date: '13 Jul 2026', note: 'Internal bug-hunting hit the point where two expert testers couldn\'t find anything in an evening, so the release-candidate build went out for real. Before it was cut, the app gained over-the-air updates: fixes to logic and copy now reach installed phones on next launch, no new store review needed — and a fingerprint check makes it impossible for an update to land on an app binary it isn\'t compatible with. The Android track moved too: test device in hand, and a re-read of the launch playbook caught that Android needs its own hardware install-proof (the sibling of the iPhone\'s App Attest) before its first test build.' },
      { title: 'Device-testing polish: smoother start, fixed confirmation, skimmable interview', date: '13 Jul 2026', note:'Three fixes from testing the real build on a phone. The security handshake now runs the instant the interview opens — quietly, while you read the first question — instead of pausing Lola\'s first reply. The contact form\'s confirmation email is fixed: it was being sent a way the server discards the moment it replies to you, so senders got silence even though our inbox got the report; now it lands (with a regression test so it can\'t regress). And Lola now bolds the actual question in each message, so you can skim the reasoning and still catch what\'s being asked.' },
      { title: 'The iPhone proves it\'s real — without a puzzle', date: '13 Jul 2026', note: 'On the web, a Cloudflare human-check guards the AI endpoint. The phone can\'t show that puzzle without nagging you, so iOS uses Apple App Attest instead: the moment you open the app, the iPhone\'s Secure Enclave signs a hardware-backed proof our server verifies — invisibly, no tap — and you get the same short-lived token the web check earns. We wrote the full verifier (it walks Apple\'s certificate chain to their published root and confirms the challenge is fresh and bound to this exact device) and proved it against a real attestation from the actual build on a physical iPhone. It ships switched off behind a flag until it\'s deployed and deliberately turned on.' },
      { title: 'A "My account" page + a freshness robot', date: '13 Jul 2026', note: 'Email preferences (weekly roundup on/off), language, and delete now live in one account page instead of scattered across the menu. The interview\'s arrival question got tap-to-answer timeframe chips (a specific month still works too). And a monthly automated check flags any official figure that\'s gone stale or any government source link that stops resolving — so the "last verified" dates stay true, not decorative.' },
      { title: 'The pre-launch trust review — every fix shipped', date: '13 Jul 2026', note: 'Five independent reviewers went over the whole product with fresh eyes, and the full fix queue is now cleared. Lola can no longer praise an income the plan is about to flag or brush off a personal-case question; her first bubble discloses she\'s an AI. The AI endpoint got a human-check (Cloudflare Turnstile) and a budget alarm. Penalty steps like Modelo 720 are kept ("may apply") when you\'d rather not say, instead of silently dropping. Share links keep your answers off our servers. The legal figures live in one tested registry, the income threshold counts your real dependents, the privacy policy spells out lawful bases and retention, and the home page shows a real cited step instead of abstract badges.' },
      { title: 'The engine audit — and 13 new steps from it', date: '13 Jul 2026', note: 'A full one-night audit of every rule in the catalog, triggered by real family testing: fifteen findings fixed (Spanish passports offered the foreigner registration, job seekers routed to the no-work visa, short stays handed the full visa roadmap — all gone), plus nine new officially-sourced steps including the work and student routes and the one-year citizenship fast-track for spouses of Spanish citizens. The catalog is now 73 steps, every regional tax figure on the map is verified — foral territories included — and the licence-exchange country list matches the DGT\'s own table.' },
      { title: 'A public changelog — and every step says when it was last checked', date: '12 Jul 2026', note: 'Rules change; we say so. Every correction to the catalog is now on a public, dated changelog, and every step and guide carries a "last verified" date linking to it. The first regional entry came from the same day\'s verification pass: Valencia cut its property transfer tax to 9% in June — most of the internet still says 10%.' },
      { title: 'Share your roadmap — and meet four sample lives', date: '12 Jul 2026', note: 'A Share button now makes a read-only link to your roadmap (it encodes your answers, never your notes — the dialog says so plainly). And the sample plan became four: US retirees, a German family on the visa-free EU path, a Canadian digital nomad, and a British couple who already own a home in Andalucía — each a real engine run, not a brochure.' },
      { title: 'Real regional rates, verified at the source', date: '12 Jul 2026', note: 'The roadmap now shows the actual transfer-tax rate for Andalucía, Madrid, Cataluña, and Valencia, and the wealth-tax reliefs for Madrid and Andalucía — each figure checked the same day on that region\'s own tax portal, with the source linked next to it. Regions we haven\'t verified yet simply don\'t show a figure — no secondhand numbers.' },
      { title: 'Your last note shapes your roadmap — and “simpler” is said out loud', date: '12 Jul 2026', note: 'The interview\'s final "anything else I should know?" is now read for real facts — mention the dog and the pet steps appear immediately. Answers that remove steps say so ("−5 steps — simpler for you") instead of shrinking the roadmap silently. Also: the consulate step no longer quotes US wait times to everyone (they vary widely by consulate — check yours), and the privacy page says more precisely what our analytics contain.' },
      { title: 'A quieter Lola, a calmer finish, and a contact page', date: '11 Jul 2026', note: 'Lola\'s spoken voice is retired — it never fit the fast tap-through interview — though you can still dictate answers by microphone. The interview now ends properly: your last note is acknowledged, then a short countdown hands over to your roadmap instead of an abrupt jump. And "report a problem" grew into a real contact page — questions, feedback, or reports, one form, linked from every footer.' },
      { title: 'Lola gets her charm back', date: '10 Jul 2026', note: 'A same-night fix batch from an evening of family testing: Lola\'s reactions can see the whole conversation again — so she notices when the dog is coming too — while still never stating a fact or number outside your sourced roadmap. Arriving from a guide page is greeted by name again, the first question opens with the move itself, voice became opt-in, and the roadmap sheet ducked out from under the iPhone\'s Dynamic Island.' },
      { title: 'One homepage that shows the product working', date: '10 Jul 2026', note: 'Home and "how it works" merged into a single scrolling story: the Spain postcard up top, then a live loop of a roadmap building itself as questions get answered, a real sample as proof — 100% free, no catch — and the honesty pledge. Four homepage philosophies were prototyped and walked side by side; the warmest one won.' },
      { title: 'The interview builds your roadmap live', date: '10 Jul 2026', note: 'Answers are taps now, every question explains why it\'s asked, and your roadmap grows on screen while you talk to Lola — steps appearing, already dated, as each answer lands. Leave halfway and your progress waits for you. Born from watching the first real users: the data said the interview was the wall, so the interview became the product.' },
      { title: 'An honest income check', date: '10 Jul 2026', note: 'If your answers suggest your income can\'t reach a visa route\'s requirement, the roadmap now says so early — and conservatively, only when even the top of your range falls short — so you find out at the planning stage, not at the consulate.' },
      { title: 'Five languages, now on the iPhone too', date: '5 Jul 2026', note: 'A day after the web learned five languages, the iOS app caught up: a new TestFlight build carries the full localization and the mid-interview language switch onto the phone, verified on a real device. It shipped the disciplined way — the native user-flow tests had to pass before a single build was cut.' },
      { title: 'Saved roadmaps that actually save', date: '5 Jul 2026', note: 'A database permission change had quietly stopped signed-in roadmaps from persisting — and the failure was being swallowed, so it hid for days. Fixed on the live databases, verified end to end, and any future save failure now raises an alarm instead of vanishing. If you sign in, your roadmap is safe on every device again.' },
      { title: 'Cinco idiomas en un día', date: '5 Jul 2026', note: 'The whole experience now ships in five languages — English, Español, Français, Deutsch, Italiano. Lola interviews in yours, all sixty steps and guides read natively, emails and the printable roadmap follow your language, and each language meets its own sample couple. The web has real per-language pages for search engines, and your language choice follows you from browser to inbox.' },
      { title: 'The tests got a fresh-eyes audit', date: '5 Jul 2026', note: 'Before translating anything, every safety net was re-checked against reality: ten critical user journeys got honest coverage verdicts, the interview proved it already understands Spanish answers, and every email and the printable report are now snapshot-frozen so a translation can\'t quietly break them.' },
      { title: 'A safer name: Get Camino', date: '4 Jul 2026', note: 'The app and site now go by Get Camino — a distinctive compound matching the domain we already own, chosen deliberately before any brand spend on a crowded word.' },
      { title: 'Voice that takes turns', date: '4 Jul 2026', note: 'Opening the mic stops Lola mid-sentence; closing it keeps your last words; the cue appears when the mic is actually hot; the answer box grows as you dictate; and no spinner is allowed to live past 35 seconds — Lola owns the retry.' },
      { title: 'The app tests itself now', date: '4 Jul 2026', note: 'Twelve automated web journeys — including signing in and reworking a real roadmap — plus iOS simulator flows on every release train. The first run caught a bug on every page load that humans had scrolled straight past.' },
      { title: 'Every official source link, click-tested', date: '4 Jul 2026', note: 'All 55 government links checked against their steps; two were quietly broken (a retired portal, a cookie wall) and now point where they should.' },
      { title: 'Region-aware steps', date: '4 Jul 2026', note: 'The interview now asks which comunidad you\'re settling in, and the steps whose rules vary by region — transfer tax, wealth tax, school admissions, property tax — say so and name yours. Region-by-region rates come next as a sourced content pass.' },
      { title: 'Privacy, terms & delete-my-account', date: '4 Jul 2026', note: 'The grown-up pages: plain-language privacy policy and terms in every footer, cookieless analytics (no banner needed), and one-tap permanent account deletion in the menu.' },
      { title: 'Every guide got a written explainer', date: '4 Jul 2026', note: 'Sixty pages now tell you what each step actually is and how it feels in practice — with a build rule that the prose can never introduce a number the step itself doesn\'t carry.' },
      { title: 'Roadmap PDF export', date: '3 Jul 2026', note: 'One tap turns your roadmap into a clean printable report — estimated vs firm dates, official sources included. For the fridge door, or the gestor.' },
      { title: 'Report a problem', date: '3 Jul 2026', note: 'A quiet line in the menu, one text box, straight to us. Every report makes the roadmap better.' },
      { title: '“This week” view', date: '3 Jul 2026', note: 'One tap on your roadmap and you see just what needs your attention now — what’s slipped and what’s due in the next seven days. A clear week says so, honestly.' },
      { title: 'A free guide for every step', date: '3 Jul 2026', note: 'Sixty public pages — one per step in the catalog, each with when it’s due, why it matters, and the official source. The same facts your roadmap is built from, open to everyone.' },
      { title: 'One calmer nav everywhere', date: '3 Jul 2026', note: 'Desktop now matches mobile: browsing lives in the ☰ menu, the bar keeps just the actions.' },
      { title: 'The weekly roundup + welcome email', date: '3 Jul 2026', note: 'What’s overdue and what’s coming up, never more than a handful of tasks, each with a concrete tip. A welcome note when you join, one-click unsubscribe, and silence when there’s nothing pressing.' },
      { title: 'Passwordless email sign-in', date: '3 Jul 2026', note: 'A link (or one-time code) lands in your inbox and signs you in — no password to invent, works across devices.' },
      { title: '“Email me my roadmap”', date: '3 Jul 2026', note: 'One field on your fresh roadmap: saves it, creates your account silently, and the emailed link brings you back signed in.' },
      { title: 'Overdue tracking', date: '3 Jul 2026', note: 'Steps past their date now say so, in red — and Lola helps you re-flow the plan instead of letting it quietly rot.' },
      { title: 'Sample plan', date: '3 Jul 2026', note: 'See a real, full roadmap (Susan & Tom’s) before answering a single question.' },
      { title: 'Sign in with Apple + a cleaner sign-in dialog', date: '3 Jul 2026', note: 'One tap on iOS; Google everywhere.' },
      { title: 'iOS app in TestFlight', date: '1 Jul 2026', note: 'Full parity with the web: voice, dictation, the living roadmap.' },
    ],
  },
  {
    h: 'In progress',
    items: [
      { title: 'The EU storefronts (Spain included)', note: 'The iOS app is live worldwide except the EU\'s App Store storefronts, which Apple withholds until a pending business-identity verification completes and the trader declaration is filed. The web app serves Spain and the EU fully in the meantime; the moment the case closes, the storefronts unlock.' },
      { title: 'The languages get their human pass', note: 'Machine-drafted, mechanically linted — and now verified by native speakers, sentence by sentence, before launch. Corrections land as reviewable diffs against frozen snapshots.' },
      { title: 'Real users become the testers', note: 'Family testing ran its course — the last full evening of expert testing found nothing. From here, real users, crash monitoring, and over-the-air fixes are the quality loop; every bug that reaches a person still earns a permanent regression test.' },
      { title: 'A move-cost estimate — what the whole move costs', note: 'The roadmap tells you what to do and when; this adds what it costs. A researched pass priced every step in the catalog and sorted them by how honestly we can state each one — a fixed government fee, a percentage of your home price, a personal cost only you can set, or free. It\'s a new "Costs" tab, now live on the web: the fixed government fees are verified against their official source; the percentages and market prices stay marked as estimates until they\'re checked too. The total is always a range, and personal costs (a scouting trip, a lawyer) stay yours to set — we won\'t guess them.' },
      { title: 'A "when should I land?" timeline — the hidden tax-year trap', note: 'A new "Timing" tab, now live on the web: pick an arrival month and your real roadmap re-computes, every deadline shifting with it. The point is a rule almost no one sees: Spain taxes you as a resident for a whole calendar year only if you\'re there more than 183 days, so arriving a few weeks either side of early July changes which year Spain first taxes you — and moves your first tax return by a full year. Dates that are still estimates stay marked, and school-enrollment windows show as a flag, never a made-up date. Both of these — costs and timing — are being tested on the web first.' },
    ],
  },
  {
    h: 'Next',
    items: [
      { title: 'Region-by-region specifics', note: 'The rates and windows for each comunidad, verified against each region\'s own official sources — the content pass behind the region flags.' },
    ],
  },
  {
    h: 'Later',
    items: [
      { title: 'More languages', note: 'Dutch and Portuguese look likeliest next, by who actually moves to Spain.' },
    ],
  },
  {
    h: 'What we’ve decided not to build (for now)',
    intro: 'A roadmap is also the things you say no to.',
    items: [
      { title: 'A document vault', note: 'Your passport and visa papers are exactly the documents we don’t want to be a honeypot for. We’ll point you to the right storage; we won’t be it.' },
      { title: 'Push notifications', note: 'The weekly email already tells you what needs attention, and we’d rather not be another icon buzzing your pocket. If email ever isn’t enough, we’ll revisit.' },
      { title: 'A second country', note: 'Spain, done properly, before anywhere else.' },
      { title: 'Household sharing', note: 'Waiting until real users tell us they need it — not building it on spec.' },
    ],
  },
];

export default function Roadmap() {
  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll}>
      <Seo
        title="The Get Camino product roadmap — shipped, next, and honest noes"
        description="Get Camino gives you a roadmap, so it's only fair you see ours: just shipped, in progress, next — and what we've decided not to build."
        canonical="https://getcamino.app/how-i-was-built/roadmap"
      />
      <NavBar />
      <View style={styles.column}>
        <Text style={styles.eyebrow}>WHERE THE PRODUCT IS GOING</Text>
        <Text style={styles.title}>The product roadmap</Text>
        <Text style={styles.dek}>
          Get Camino gives you a roadmap, so it’s only fair you get to see ours. Updated with every
          release — last: {UPDATED}.
        </Text>
        <View style={styles.rule} />

        {SECTIONS.map((s) => (
          <View key={s.h} style={styles.section}>
            <Text style={styles.h}>{s.h}</Text>
            {s.intro && <Text style={styles.intro}>{s.intro}</Text>}
            {s.items.map((it) => (
              <View key={it.title} style={styles.item}>
                <Text style={styles.itemTitle}>{it.title}{it.date ? <Text style={styles.itemDate}>  ·  {it.date}</Text> : null}</Text>
                {it.note && <Text style={styles.itemNote}>{it.note}</Text>}
              </View>
            ))}
          </View>
        ))}

        <View style={styles.rule} />
        <Link href="/how-i-was-built" style={styles.link}>
          Curious how it’s made? Read how Get Camino was built →
        </Link>
        <Link href="/how-i-was-built/log" style={styles.link}>
          Or the full build log — every item above, with the decisions behind it →
        </Link>
      </View>
      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: palette.cal },
  scroll:    { paddingBottom: 80 },
  column:    { alignSelf: 'center', width: '100%', maxWidth: 680, paddingHorizontal: 24, paddingTop: 28 },
  eyebrow:   { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 12, letterSpacing: 2, color: palette.amber, marginBottom: 14 },
  title:     { fontFamily: 'Fraunces_600SemiBold', fontSize: 40, lineHeight: 46, color: palette.indigo, marginBottom: 16 },
  dek:       { fontFamily: 'HankenGrotesk_400Regular', fontSize: 18, lineHeight: 28, color: palette.muted },
  rule:      { height: 2, width: 48, backgroundColor: palette.amber, marginVertical: 32, borderRadius: 2 },
  section:   { marginBottom: 32 },
  h:         { fontFamily: 'Fraunces_600SemiBold', fontSize: 24, lineHeight: 30, color: palette.cobalt, marginBottom: 14 },
  intro:     { fontFamily: 'HankenGrotesk_400Regular', fontSize: 16, lineHeight: 25, color: palette.muted, fontStyle: 'italic', marginBottom: 12 },
  item:      { marginBottom: 14 },
  itemTitle: { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 17, lineHeight: 26, color: palette.indigo },
  itemDate:  { fontFamily: 'HankenGrotesk_400Regular', fontSize: 13, color: palette.muted },
  itemNote:  { fontFamily: 'HankenGrotesk_400Regular', fontSize: 15, lineHeight: 24, color: palette.muted, marginTop: 2 },
  link:      { fontFamily: 'HankenGrotesk_600SemiBold', fontSize: 15, lineHeight: 23, color: palette.cobalt, marginBottom: 16 },
});
