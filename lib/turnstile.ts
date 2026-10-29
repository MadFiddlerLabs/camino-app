/**
 * Client side of the C2b challenge: solve Cloudflare Turnstile, exchange it for a
 * short-lived session token (via /api/session), cache it, and reuse it for the interview's
 * /api/lola + /api/feedback calls until it nears expiry.
 *
 * Two-stage solve (regression fix, Sentry CAMINO-8/CAMINO-D): the widget first runs
 * offscreen — for most browsers Turnstile passes invisibly in a beat. But low-trust
 * environments (the Facebook/Instagram in-app webviews were the ones that reached real
 * users) get an INTERACTIVE challenge, which an offscreen widget can never complete: the
 * old single-stage flow silently timed out after 20s and every /api/lola call 401'd —
 * the interview was dead for the whole Facebook-referral channel. Now, when the caller
 * says the token is for a user-initiated request (`interactive: true`), an invisible
 * failure falls back to a visible overlay widget the user can actually solve.
 *
 * Web only. On native this is a no-op (returns null) — native rides its app-side counters as
 * before, and its session-token path is wired when the next native build ships. If Turnstile
 * isn't configured (no site key — e.g. local dev), it also returns null, and the server gate is
 * likewise off there, so nothing breaks.
 */
import { Platform } from 'react-native';
import { getNativeSession } from '@/lib/nativeAttest';
import { capture } from '@/lib/analytics';
import i18n from '@/lib/i18n';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';
const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// Invisible attempt: normal browsers pass in ~1s; a webview that needs interaction will never
// pass, so don't make the user sit through the old 20s — fail to the visible widget sooner.
const INVISIBLE_TIMEOUT_MS = 8_000;
// Visible attempt: the user is solving it by hand — give them real time, but never forever.
const VISIBLE_TIMEOUT_MS = 120_000;
// Once the invisible path has failed, this browser almost certainly needs interaction — skip
// straight to the visible widget for a while rather than re-serving the doomed 8s wait per turn.
const INVISIBLE_RETRY_MS = 5 * 60_000;

type TurnstileApi = {
  render: (el: HTMLElement, opts: {
    sitekey: string;
    callback: (token: string) => void;
    'error-callback'?: () => void;
    appearance?: 'always' | 'execute' | 'interaction-only';
  }) => string;
  remove: (id: string) => void;
};
const getTurnstile = (): TurnstileApi | undefined =>
  (globalThis as unknown as { turnstile?: TurnstileApi }).turnstile;

let cached: { session: string; exp: number } | null = null;
let inFlight: { promise: Promise<string | null>; interactive: boolean } | null = null;
let scriptPromise: Promise<void> | null = null;
let invisibleFailedAt = 0;
// True when the latest acquire ended because the user pressed Cancel on the visible challenge.
// lola.ts reads it to tell a choice from a failure (GETCAMINO-V, 2026-10-29).
let dismissed = false;

function loadScript(): Promise<void> {
  if (getTurnstile()) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error('turnstile script failed to load')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// Render an offscreen Managed widget and resolve with its token (invisible/instant when
// Cloudflare trusts the browser; rejects on timeout when it wants interaction).
function solveInvisible(siteKey: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const turnstile = getTurnstile();
    if (!turnstile) return reject(new Error('turnstile not available'));
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);
    let id: string | undefined;
    const cleanup = () => { try { if (id) turnstile.remove(id); } catch { /* ignore */ } container.remove(); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('turnstile timed out')); }, INVISIBLE_TIMEOUT_MS);
    id = turnstile.render(container, {
      sitekey: siteKey,
      callback: (token: string) => { clearTimeout(timeout); cleanup(); resolve(token); },
      'error-callback': () => { clearTimeout(timeout); cleanup(); reject(new Error('turnstile challenge error')); },
    });
  });
}

// The fallback: a visible widget in a minimal overlay the user can actually interact with.
// Plain DOM (not React) so lib callers — lola.ts mid-turn, contact's send — can summon it
// without any component wiring. Resolves with the token; rejects on cancel/error/timeout.
function solveVisible(siteKey: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const turnstile = getTurnstile();
    if (!turnstile) return reject(new Error('turnstile not available'));

    const overlay = document.createElement('div');
    overlay.dataset.testid = 'turnstile-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;' +
      'justify-content:center;padding:24px;background:rgba(20,24,20,0.55);';
    const card = document.createElement('div');
    card.style.cssText =
      'background:#fff;border-radius:16px;padding:24px;width:100%;max-width:360px;' +
      'box-shadow:0 12px 40px rgba(0,0,0,0.25);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;';
    const title = document.createElement('div');
    title.style.cssText = 'font-size:17px;font-weight:600;color:#1a1a1a;margin-bottom:6px;';
    title.textContent = i18n.t('securityCheck.title');
    const body = document.createElement('div');
    body.style.cssText = 'font-size:14px;line-height:20px;color:#555;margin-bottom:16px;';
    body.textContent = i18n.t('securityCheck.body');
    const slot = document.createElement('div');
    slot.style.cssText = 'min-height:65px;display:flex;justify-content:center;';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.dataset.testid = 'turnstile-cancel';
    cancel.style.cssText =
      'margin-top:14px;background:none;border:none;padding:6px 0;font-size:14px;' +
      'color:#777;cursor:pointer;text-decoration:underline;';
    cancel.textContent = i18n.t('securityCheck.cancel');
    card.append(title, body, slot, cancel);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    let id: string | undefined;
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { if (id) turnstile.remove(id); } catch { /* ignore */ }
      overlay.remove();
      fn();
    };
    const timer = setTimeout(() => settle(() => reject(new Error('turnstile timed out'))), VISIBLE_TIMEOUT_MS);
    cancel.onclick = () => settle(() => reject(new Error('dismissed')));
    try {
      id = turnstile.render(slot, {
        sitekey: siteKey,
        appearance: 'always',
        callback: (token: string) => settle(() => resolve(token)),
        'error-callback': () => settle(() => reject(new Error('turnstile challenge error'))),
      });
    } catch (e) {
      settle(() => reject(e instanceof Error ? e : new Error('turnstile render failed')));
    }
  });
}

async function acquire(interactive: boolean): Promise<string | null> {
  dismissed = false;
  try {
    await loadScript();
    let tsToken: string | null = null;
    if (Date.now() - invisibleFailedAt > INVISIBLE_RETRY_MS) {
      try {
        tsToken = await solveInvisible(SITE_KEY as string);
      } catch {
        invisibleFailedAt = Date.now();
      }
    }
    if (!tsToken) {
      if (!interactive) return null; // background warm-up — never surprise the user with an overlay
      try {
        tsToken = await solveVisible(SITE_KEY as string);
        capture('turnstile_visible_challenge', { outcome: 'solved' });
      } catch (e) {
        dismissed = e instanceof Error && e.message === 'dismissed';
        capture('turnstile_visible_challenge', { outcome: dismissed ? 'dismissed' : 'failed' });
        return null;
      }
    }
    const res = await fetch(`${API_BASE}/api/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: tsToken }),
    });
    if (!res.ok) return null;
    const { session } = (await res.json()) as { session?: string };
    if (!session) return null;
    const exp = Number(session.split('.')[0]) || (Date.now() + 25 * 60_000);
    cached = { session, exp };
    return session;
  } catch {
    return null; // fail soft — the server decides whether to require a session
  }
}

/** True when the latest attempt to get a session ended with the user canceling the visible challenge. */
export function challengeDismissed(): boolean {
  return dismissed;
}

/**
 * A valid session token, solving the challenge on first use and caching until it nears expiry.
 * Returns null on web when Turnstile isn't configured, and always null on native.
 *
 * `interactive: true` marks a token needed for a user-initiated request RIGHT NOW: if the
 * invisible solve can't pass (in-app webviews), the user gets a visible challenge instead of a
 * guaranteed 401. Leave it off for background warm-ups (interview mount preload).
 */
export async function getSessionToken(opts?: { interactive?: boolean }): Promise<string | null> {
  // Native: App Attest (lib/nativeAttest.native.ts) mints the session; web falls through to Turnstile.
  if (Platform.OS !== 'web') return getNativeSession();
  if (!SITE_KEY) return null;
  const interactive = opts?.interactive === true;
  if (cached && cached.exp - 60_000 > Date.now()) return cached.session;
  // Reuse a pending acquire — unless it can't escalate to the visible widget and we need to:
  // then chain behind it and escalate only if it comes back empty-handed.
  if (inFlight && (inFlight.interactive || !interactive)) return inFlight.promise;
  const prev = inFlight?.promise;
  const promise = (prev ? prev.then(s => s ?? acquire(true)) : acquire(interactive))
    .finally(() => { if (inFlight?.promise === promise) inFlight = null; });
  inFlight = { promise, interactive };
  return promise;
}
