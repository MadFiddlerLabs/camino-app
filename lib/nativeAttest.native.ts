/**
 * Native attestation session (C2b — the non-spoofable native equivalent of the web's Turnstile).
 *
 * iOS: Apple App Attest via @expo/app-integrity — a hardware-backed Secure-Enclave key attests the
 * app is genuine, silently (zero UX). Server verifies (lib/appAttest.ts).
 * Android: Google Play Integrity via the same lib's standard request — Google issues a signed
 * verdict that the app is a genuine Play install on a genuine device. Server verifies
 * (lib/playIntegrity.ts). Both paths mint the SAME HMAC session token web gets from Turnstile.
 *
 * Each platform stays gated behind its own server flag (NATIVE_ATTESTATION_ENABLED for iOS,
 * PLAY_INTEGRITY_ENABLED for Android) until on-device validation; while off, the exchange returns
 * 501 → null → native Lola stays gated (safe default). The Android path is additionally inert until
 * EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER is set (it doesn't exist until the Play/Cloud project is
 * created), so this ships harmlessly before the Play account is ready.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppIntegrity from '@expo/app-integrity';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';
const KEY_ID_STORAGE = 'camino.appattest.keyId';
// Google Cloud project number tied to the Play app; required to prepare the Play Integrity provider.
// Empty until the Play/Cloud project exists → the Android path stays inert (returns null).
const CLOUD_PROJECT_NUMBER = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER ?? '';
// Cap on the whole attestation exchange. The native integrity calls have no timeout of their own,
// and lola.ts awaits the session before its 35s fetch timer starts — so one stalled call (a Redmi,
// 2026-10-26) spun the interview forever. On timeout we return null: the server answers 401 and
// Lola shows its normal error, which the user can retry.
export const ATTEST_TIMEOUT_MS = 15_000;

let cached: { session: string; exp: number } | null = null;
let inFlight: Promise<string | null> | null = null;
let integrityProviderReady: Promise<void> | null = null;

async function post(body: unknown): Promise<Response> {
  return fetch(`${API_BASE}/api/session`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

/** Fetch a one-time server challenge (signed nonce, 5-min TTL — prevents replay). */
async function fetchChallenge(): Promise<string | null> {
  const chRes = await post({ kind: 'challenge' });
  if (!chRes.ok) return null;
  const { challenge } = (await chRes.json()) as { challenge?: string };
  return challenge ?? null;
}

/** Store the minted session token + its expiry, and return it. */
function cacheSession(session: string): string {
  const exp = Number(session.split('.')[0]) || (Date.now() + 25 * 60_000);
  cached = { session, exp };
  return session;
}

// ── iOS: Apple App Attest ─────────────────────────────────────────────────────────
async function attestIos(): Promise<string | null> {
  // On the simulator App Attest is unavailable (isSupported === false).
  if (!AppIntegrity.isSupported) return null;

  // 1. A persistent Secure-Enclave key — generated once, keyId stored (the key never leaves it).
  let keyId = await AsyncStorage.getItem(KEY_ID_STORAGE);
  if (!keyId) {
    keyId = await AppIntegrity.generateKeyAsync();
    await AsyncStorage.setItem(KEY_ID_STORAGE, keyId);
  }
  const challenge = await fetchChallenge();
  if (!challenge) return null;

  // 2. Attest the key against the challenge (hardware-backed, no user interaction).
  const attestation = await AppIntegrity.attestKeyAsync(keyId, challenge);

  // 3. Exchange the attestation for a session token (same token the web Turnstile path mints).
  const res = await post({ kind: 'attest', keyId, attestation, challenge });
  if (!res.ok) return null; // 501 while the server flag is off, or 403 on a bad attestation
  const { session } = (await res.json()) as { session?: string };
  return session ? cacheSession(session) : null;
}

// ── Android: Google Play Integrity ──────────────────────────────────────────────────
async function attestAndroid(): Promise<string | null> {
  if (!CLOUD_PROJECT_NUMBER) return null; // inert until the Play/Cloud project exists

  // 1. Warm the integrity token provider once (idempotent per app run).
  // A failed warm-up is forgotten so the next attempt retries it instead of rethrowing forever.
  if (!integrityProviderReady) {
    integrityProviderReady = AppIntegrity.prepareIntegrityTokenProviderAsync(CLOUD_PROJECT_NUMBER)
      .catch((err) => { integrityProviderReady = null; throw err; });
  }
  await integrityProviderReady;

  // 2. Challenge → bound in as the Play Integrity requestHash (Google echoes it in the verdict).
  const challenge = await fetchChallenge();
  if (!challenge) return null;

  // 3. Ask Google Play for an integrity verdict token over that challenge.
  const integrityToken = await AppIntegrity.requestIntegrityCheckAsync(challenge);

  // 4. Exchange the token for a session (same token the web Turnstile path mints).
  const res = await post({ kind: 'play-integrity', integrityToken, challenge });
  if (!res.ok) return null; // 501 while the server flag is off, or 403 on a failed verdict
  const { session } = (await res.json()) as { session?: string };
  return session ? cacheSession(session) : null;
}

async function attest(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') return await attestIos();
    if (Platform.OS === 'android') return await attestAndroid();
    return null;
  } catch {
    return null; // fail soft — the server decides whether to require a session
  }
}

function withTimeout(p: Promise<string | null>, ms: number): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

export async function getNativeSession(): Promise<string | null> {
  const now = Date.now();
  if (cached && cached.exp - 60_000 > now) return cached.session;
  if (inFlight) return inFlight;
  // A late-finishing attempt still caches its session, so the next call can use it.
  inFlight = withTimeout(attest(), ATTEST_TIMEOUT_MS).finally(() => { inFlight = null; });
  return inFlight;
}
