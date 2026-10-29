/**
 * Regression: a user on a translated Android Chrome page pressed Cancel on the visible security
 * check, the interview sent /api/lola with no session, and the 401 paged Sentry (GETCAMINO-V,
 * 2026-10-29). Canceling is a choice, not a failure. askAnthropic now throws
 * ChallengeDismissedError without sending the request, and the interview skips Sentry for it.
 * Every other missing-session case still reaches the server, which stays the judge.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const turnstile = vi.hoisted(() => ({
  getSessionToken: vi.fn(),
  challengeDismissed: vi.fn(),
}));
vi.mock('@/lib/turnstile', () => turnstile);

import { askAnthropic, ChallengeDismissedError } from '@/lib/lola';

const ask = () => askAnthropic({ mode: 'coach', params: { objTitle: 't', objCategory: 'c' }, messages: [] } as never);

beforeEach(() => {
  turnstile.getSessionToken.mockReset();
  turnstile.challengeDismissed.mockReset().mockReturnValue(false);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })));
});

describe('askAnthropic after the security check (GETCAMINO-V)', () => {
  it('a dismissed challenge throws ChallengeDismissedError and sends nothing', async () => {
    turnstile.getSessionToken.mockResolvedValue(null);
    turnstile.challengeDismissed.mockReturnValue(true);
    await expect(ask()).rejects.toBeInstanceOf(ChallengeDismissedError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('a missing session for any other reason still asks the server, and its 401 stays a real error', async () => {
    turnstile.getSessionToken.mockResolvedValue(null);
    await expect(ask()).rejects.toThrow('lola proxy 401');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('a session sends the request with its header, even after an earlier dismiss', async () => {
    turnstile.getSessionToken.mockResolvedValue('tok');
    turnstile.challengeDismissed.mockReturnValue(true);
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({ text: 'hola' }) } as never);
    await expect(ask()).resolves.toBe('hola');
    const init = vi.mocked(fetch).mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers['x-camino-session']).toBe('tok');
  });
});
