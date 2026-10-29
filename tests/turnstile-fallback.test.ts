// @vitest-environment jsdom
/**
 * Regression: "lola proxy 401" for Facebook in-app browser users (Sentry CAMINO-8 / CAMINO-D,
 * 2026-07-13..15). Cloudflare Turnstile demands an INTERACTIVE challenge in low-trust webviews,
 * which the old offscreen-only widget could never complete — it timed out silently after 20s,
 * getSessionToken() failed soft to null, and every /api/lola call 401'd: the interview was dead
 * for the whole Facebook-referral channel.
 *
 * The fix (lib/turnstile.ts): user-initiated calls pass `interactive: true`; when the invisible
 * solve fails, a VISIBLE overlay widget renders so the user can actually solve it. These tests
 * drive that logic with a fake `window.turnstile` API — the widget behavior itself is
 * Cloudflare's; what we own (and pin here) is the fallback orchestration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const SITE_KEY = 'test-site-key';
const SESSION = `${Date.now() + 30 * 60_000}.deadbeef`;

// A controllable fake of the Turnstile API. Each render() records its options; tests decide
// when (or whether) a widget "solves" by invoking the recorded callback.
type RenderCall = {
  el: HTMLElement;
  opts: { sitekey: string; callback: (t: string) => void; 'error-callback'?: () => void; appearance?: string };
};
let renders: RenderCall[];

function installFakeTurnstile() {
  renders = [];
  (globalThis as Record<string, unknown>).turnstile = {
    render: (el: HTMLElement, opts: RenderCall['opts']) => {
      renders.push({ el, opts });
      return `widget-${renders.length}`;
    },
    remove: () => {},
  };
}

// The visible overlay is plain DOM appended to <body>, found by its testid.
const overlay = () => document.querySelector('[data-testid="turnstile-overlay"]');
// The invisible attempt renders into the offscreen container itself; the visible one into a
// slot inside the overlay card.
const isOffscreen = (el: HTMLElement) => el.style.left === '-9999px';

async function importFresh() {
  vi.resetModules();
  process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY = SITE_KEY;
  return import('@/lib/turnstile');
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  installFakeTurnstile();
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ session: SESSION }),
  })));
});

describe('turnstile session: invisible-first with visible fallback (CAMINO-8/D)', () => {
  it('background (non-interactive) call fails soft to null and never shows the overlay', async () => {
    const { getSessionToken } = await importFresh();
    const p = getSessionToken();
    await vi.advanceTimersByTimeAsync(8_000); // invisible attempt times out (webview: no auto-solve)
    await expect(p).resolves.toBeNull();
    expect(overlay()).toBeNull();
    expect(renders).toHaveLength(1);
    expect(isOffscreen(renders[0].el)).toBe(true);
  });

  it('interactive call falls back to a visible widget and exchanges its token for a session', async () => {
    const { getSessionToken } = await importFresh();
    const p = getSessionToken({ interactive: true });
    await vi.advanceTimersByTimeAsync(8_000); // invisible attempt times out
    expect(overlay()).not.toBeNull();         // ...so the visible overlay is up
    expect(renders).toHaveLength(2);
    expect(isOffscreen(renders[1].el)).toBe(false);
    expect(renders[1].opts.appearance).toBe('always');
    renders[1].opts.callback('user-solved-token'); // the user solves the visible challenge
    await expect(p).resolves.toBe(SESSION);
    expect(overlay()).toBeNull(); // overlay cleaned up
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/api/session');
    // The solved session is cached: the next call must not re-challenge.
    await expect(getSessionToken({ interactive: true })).resolves.toBe(SESSION);
    expect(renders).toHaveLength(2);
  });

  it('after an invisible failure, the next interactive call skips straight to the visible widget', async () => {
    const { getSessionToken } = await importFresh();
    const warm = getSessionToken(); // the interview-mount preload
    await vi.advanceTimersByTimeAsync(8_000);
    await expect(warm).resolves.toBeNull();

    const p = getSessionToken({ interactive: true });
    await vi.advanceTimersByTimeAsync(0); // no 8s re-wait: the doomed invisible attempt is skipped
    expect(overlay()).not.toBeNull();
    renders[renders.length - 1].opts.callback('user-solved-token');
    await expect(p).resolves.toBe(SESSION);
  });

  it('dismissing the visible challenge fails soft to null (server still answers 401)', async () => {
    const { getSessionToken } = await importFresh();
    const p = getSessionToken({ interactive: true });
    await vi.advanceTimersByTimeAsync(8_000);
    const cancel = document.querySelector<HTMLButtonElement>('[data-testid="turnstile-cancel"]');
    expect(cancel).not.toBeNull();
    cancel!.click();
    await expect(p).resolves.toBeNull();
    expect(overlay()).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('remembers a dismiss until the next attempt, so lola.ts can tell a choice from a failure (GETCAMINO-V)', async () => {
    const { getSessionToken, challengeDismissed } = await importFresh();
    expect(challengeDismissed()).toBe(false);
    const p = getSessionToken({ interactive: true });
    await vi.advanceTimersByTimeAsync(8_000);
    document.querySelector<HTMLButtonElement>('[data-testid="turnstile-cancel"]')!.click();
    await expect(p).resolves.toBeNull();
    expect(challengeDismissed()).toBe(true);

    // The next turn shows the challenge again; solving it clears the flag.
    const again = getSessionToken({ interactive: true });
    await vi.advanceTimersByTimeAsync(0);
    renders[renders.length - 1].opts.callback('user-solved-token');
    await expect(again).resolves.toBe(SESSION);
    expect(challengeDismissed()).toBe(false);
  });

  it('a challenge that errors is a failure, not a dismiss', async () => {
    const { getSessionToken, challengeDismissed } = await importFresh();
    const p = getSessionToken({ interactive: true });
    await vi.advanceTimersByTimeAsync(8_000);
    renders[renders.length - 1].opts['error-callback']!();
    await expect(p).resolves.toBeNull();
    expect(challengeDismissed()).toBe(false);
  });

  it('an interactive call arriving while a background solve is pending escalates instead of inheriting its null', async () => {
    const { getSessionToken } = await importFresh();
    const warm = getSessionToken();                        // preload, in flight...
    const p = getSessionToken({ interactive: true });      // ...user answers within 8s
    await vi.advanceTimersByTimeAsync(8_000);              // preload's invisible attempt dies
    await expect(warm).resolves.toBeNull();
    await vi.advanceTimersByTimeAsync(0);
    expect(overlay()).not.toBeNull();                      // the interactive caller got the fallback
    renders[renders.length - 1].opts.callback('user-solved-token');
    await expect(p).resolves.toBe(SESSION);
  });
});
