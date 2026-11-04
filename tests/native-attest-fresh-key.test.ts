/**
 * Regression: an iPhone in Cupertino hung on App Attest on four tries in a row (GETCAMINO-Q,
 * 2026-11-04). The app stored one key and re-attested it every session, but Apple allows one
 * attestation per key and attestKey can hang forever on a key it won't accept, so a stuck key
 * stayed stuck. The fix (lib/nativeAttest.native.ts): every attestation uses a new key. These
 * tests drive the iOS path with a mocked @expo/app-integrity and fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const never = () => new Promise<never>(() => {});

const integrity = vi.hoisted(() => ({
  isSupported: true,
  prepareIntegrityTokenProviderAsync: vi.fn(),
  requestIntegrityCheckAsync: vi.fn(),
  generateKeyAsync: vi.fn(),
  attestKeyAsync: vi.fn(),
}));
vi.mock('@expo/app-integrity', () => integrity);

// An already-expired session, so each getNativeSession call attests again instead of using the cache.
const EXPIRED = '1.deadbeef';
let attestStatus: number;

async function importFresh() {
  vi.resetModules();
  // resetModules gives the module under test a fresh react-native stub, so set the platform on that one.
  const { Platform } = await import('react-native');
  (Platform as { OS: string }).OS = 'ios';
  return import('@/lib/nativeAttest.native');
}

const attestedKeys = () => integrity.attestKeyAsync.mock.calls.map((c) => c[0]);

beforeEach(() => {
  vi.useFakeTimers();
  attestStatus = 200;
  integrity.isSupported = true;
  let n = 0;
  integrity.generateKeyAsync.mockReset().mockImplementation(async () => `key-${++n}`);
  integrity.attestKeyAsync.mockReset().mockResolvedValue('attestation');
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => {
    const { kind } = JSON.parse(init.body) as { kind: string };
    if (kind === 'challenge') return { ok: true, json: async () => ({ challenge: 'ch' }) };
    return { ok: attestStatus === 200, status: attestStatus, json: async () => ({ session: EXPIRED }) };
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('App Attest uses a new key for every attestation (GETCAMINO-Q, 2026-11-04)', () => {
  it('a later session never re-attests the key from an earlier success', async () => {
    const { getNativeSession } = await importFresh();
    await expect(getNativeSession()).resolves.toBe(EXPIRED);
    await expect(getNativeSession()).resolves.toBe(EXPIRED);
    expect(attestedKeys()).toEqual(['key-1', 'key-2']);
  });

  it('a hung attestKey resolves null at the timeout, and the retry uses a new key', async () => {
    integrity.attestKeyAsync.mockImplementationOnce(never);
    const { getNativeSession, ATTEST_TIMEOUT_MS } = await importFresh();
    const first = getNativeSession();
    await vi.advanceTimersByTimeAsync(ATTEST_TIMEOUT_MS);
    await expect(first).resolves.toBeNull();

    await expect(getNativeSession()).resolves.toBe(EXPIRED);
    expect(attestedKeys()).toEqual(['key-1', 'key-2']);
  });

  it('an attestKey error resolves null, and the retry uses a new key', async () => {
    integrity.attestKeyAsync.mockRejectedValueOnce(new Error('invalid key'));
    const { getNativeSession } = await importFresh();
    await expect(getNativeSession()).resolves.toBeNull();
    await expect(getNativeSession()).resolves.toBe(EXPIRED);
    expect(attestedKeys()).toEqual(['key-1', 'key-2']);
  });

  it('a server refusal resolves null, and the retry uses a new key', async () => {
    attestStatus = 403;
    const { getNativeSession } = await importFresh();
    await expect(getNativeSession()).resolves.toBeNull();
    attestStatus = 200;
    await expect(getNativeSession()).resolves.toBe(EXPIRED);
    expect(attestedKeys()).toEqual(['key-1', 'key-2']);
  });

  it('an unsupported device makes no key and no request', async () => {
    integrity.isSupported = false;
    const { getNativeSession } = await importFresh();
    await expect(getNativeSession()).resolves.toBeNull();
    expect(integrity.generateKeyAsync).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
