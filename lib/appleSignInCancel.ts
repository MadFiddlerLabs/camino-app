// Closing Apple's sign-in sheet rejects signInAsync, and that is a choice, not a failure.
// expo-apple-authentication documents the code ERR_REQUEST_CANCELED, but on build 45
// (Expo 56, RN 0.85) the cancel reached JS with no `code` at all, so the code check missed it
// and a cancel showed a "sign-in failed" alert and paged Sentry (GETCAMINO-T, 2026-10-28).
// The native message is a fixed English string in the library (RequestCanceledException), so
// it is a stable second signal.
const CANCEL_CODE = 'ERR_REQUEST_CANCELED';
const CANCEL_MESSAGE = 'The user canceled the authorization attempt';

export function isAppleSignInCancel(e: unknown): boolean {
  const err = e as { code?: unknown; message?: unknown } | null | undefined;
  if (err?.code === CANCEL_CODE) return true;
  return typeof err?.message === 'string' && err.message.includes(CANCEL_MESSAGE);
}
