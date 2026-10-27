/**
 * Regression: the Android interview spun forever on a Redmi (2026-10-26). The native Play
 * Integrity calls have no timeout of their own, and lola.ts awaits the session before its 35s
 * fetch timer starts — so one stalled call left the spinner up with no request ever sent.
 *
 * The fix (lib/nativeAttest.native.ts): the whole exchange is capped at ATTEST_TIMEOUT_MS and
 * resolves null (→ 401 → Lola's normal error), and a failed provider warm-up is retried on the
 * next attempt instead of being cached as a permanent rejection. These tests drive the Android
 * path with a mocked @expo/app-integrity and fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const SESSION = `${Date.now() + 30 * 60_000}.deadbeef`;
const never = () => new Promise<never>(() => {});

const integrity = vi.hoisted(() => ({
  isSupported: true,
  prepareIntegrityTokenProviderAsync: vi.fn(),
  requestIntegrityCheckAsync: vi.fn(),
  generateKeyAsync: vi.fn(),
  attestKeyAsync: vi.fn(),
}));
vi.mock('@expo/app-integrity', () => integrity);

async function importFresh() {
  vi.resetModules();
  process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER = '1234567890';
  // resetModules gives the module under test a fresh react-native stub, so set the platform on that one.
  const { Platform } = await import('react-native');
  (Platform as { OS: string }).OS = 'android';
  return import('@/lib/nativeAttest.native');
}

beforeEach(() => {
  vi.useFakeTimers();
  integrity.prepareIntegrityTokenProviderAsync.mockReset().mockResolvedValue(undefined);
  integrity.requestIntegrityCheckAsync.mockReset().mockResolvedValue('integrity-token');
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => {
    const { kind } = JSON.parse(init.body) as { kind: string };
    return {
      ok: true,
      json: async () => (kind === 'challenge' ? { challenge: 'ch' } : { session: SESSION }),
    };
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('native attestation timeout (Redmi infinite spinner, 2026-10-26)', () => {
  it('a genuine Play Integrity exchange returns the session', async () => {
    const { getNativeSession } = await importFresh();
    await expect(getNativeSession()).resolves.toBe(SESSION);
  });

  it('a stalled provider warm-up resolves null at the timeout, not never', async () => {
    integrity.prepareIntegrityTokenProviderAsync.mockImplementation(never);
    const { getNativeSession, ATTEST_TIMEOUT_MS } = await importFresh();
    let settled: string | null | undefined;
    void getNativeSession().then((s) => { settled = s; });

    await vi.advanceTimersByTimeAsync(ATTEST_TIMEOUT_MS - 1);
    expect(settled).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBeNull();
  });

  it('a stalled integrity check resolves null, and the next call starts a fresh attempt', async () => {
    integrity.requestIntegrityCheckAsync.mockImplementationOnce(never);
    const { getNativeSession, ATTEST_TIMEOUT_MS } = await importFresh();
    const first = getNativeSession();
    await vi.advanceTimersByTimeAsync(ATTEST_TIMEOUT_MS);
    await expect(first).resolves.toBeNull();

    // The stalled attempt no longer holds the in-flight slot.
    await expect(getNativeSession()).resolves.toBe(SESSION);
    expect(integrity.requestIntegrityCheckAsync).toHaveBeenCalledTimes(2);
  });

  it('a failed provider warm-up is retried on the next attempt', async () => {
    integrity.prepareIntegrityTokenProviderAsync.mockRejectedValueOnce(new Error('play services busy'));
    const { getNativeSession } = await importFresh();
    await expect(getNativeSession()).resolves.toBeNull();
    await expect(getNativeSession()).resolves.toBe(SESSION);
    expect(integrity.prepareIntegrityTokenProviderAsync).toHaveBeenCalledTimes(2);
  });
});
