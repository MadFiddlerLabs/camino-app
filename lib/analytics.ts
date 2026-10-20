// Product analytics (web) via PostHog. The native counterpart (lib/analytics.native.ts) is the
// posthog-react-native implementation (live since build 31) — same interface both sides so
// callers are platform-agnostic.
//
// The key is only present in the staging/production web bundles (set in the EAS envs, NOT in the
// local .env), so local dev sends nothing and never pollutes the funnel. Every event carries an
// `environment` super-property (production/staging) so dashboards can filter to real users.
import posthog from 'posthog-js';
import { APP_ENV } from '@/core/env';

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';
let ready = false;

export function initAnalytics() {
  if (ready || !KEY || typeof window === 'undefined') return;
  // Cookieless promise includes RETURNING visitors: scrub any ph_* localStorage left behind
  // by the pre-cookieless bundle (verified present on prod 2026-07-04), so "nothing persisted
  // client-side" is true for everyone, not just first-time visitors.
  try {
    for (const k of Object.keys(window.localStorage)) {
      if (k.startsWith('ph_')) window.localStorage.removeItem(k);
    }
  } catch { /* storage may be unavailable (private mode) — fine */ }
  posthog.init(KEY, {
    api_host: HOST,
    // Cookieless (user decision 2026-07-04, consent strategy): nothing persisted client-side →
    // no ePrivacy consent banner needed for EU visitors. Since 2026-10-20 this is the MadFiddlerLabs
    // standard: PostHog's server counts a visitor by a daily hash of IP + user agent and drops the
    // IP, so one visitor = one person per day (the old persistence:'memory' made every page load a
    // new visitor). REQUIRES "Cookieless tracking" ON in the project's Web analytics settings, or
    // PostHog drops these events. No GeoIP or PostHog bot detection on them. Signed-in users still
    // stitch via identify(user id) (Andrew kept this 2026-10-20).
    cookieless_mode: 'always',
    person_profiles: 'always',   // include anonymous visitors so the home→roadmap funnel + retention work
    capture_pageview: true,      // SPA route views (home / interview / plan)
    capture_pageleave: true,
    autocapture: true,
  });
  // Stamped on every event. `interview_version: 2` = the living-roadmap redesign (chips, live
  // pane, arrival-first). Events missing the property are the pre-redesign bundle — this keeps
  // pre/post comparisons honest when stale cached clients keep reporting after the deploy.
  posthog.register({ environment: APP_ENV, interview_version: 2, landing_version: 2 });
  ready = true;
}

export function capture(event: string, props?: Record<string, unknown>) {
  if (ready) posthog.capture(event, props);
}

export function identify(userId: string, props?: Record<string, unknown>) {
  if (ready) posthog.identify(userId, props);
}

export function resetAnalytics() {
  if (ready) posthog.reset();
}
