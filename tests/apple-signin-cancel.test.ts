/**
 * Regression: closing Apple's sign-in sheet on build 45 showed a "sign-in failed" alert and
 * paged Sentry (GETCAMINO-T, 2026-10-28). The cancel reached JS with no `code`, so AuthContext's
 * ERR_REQUEST_CANCELED check missed it. isAppleSignInCancel also matches the library's fixed
 * cancel message; every other Apple error must still count as a real failure.
 */
import { describe, it, expect } from 'vitest';
import { isAppleSignInCancel } from '@/lib/appleSignInCancel';

describe('isAppleSignInCancel', () => {
  it('matches the documented cancel code', () => {
    expect(isAppleSignInCancel(Object.assign(new Error('x'), { code: 'ERR_REQUEST_CANCELED' }))).toBe(true);
  });

  it('matches the cancel as it arrived on build 45: the message, with no code', () => {
    expect(isAppleSignInCancel(new Error('The user canceled the authorization attempt'))).toBe(true);
  });

  it('still treats real Apple failures as failures', () => {
    expect(isAppleSignInCancel(new Error('The authorization attempt failed for an unknown reason'))).toBe(false);
    expect(isAppleSignInCancel(Object.assign(new Error('x'), { code: 'ERR_REQUEST_UNKNOWN' }))).toBe(false);
    expect(isAppleSignInCancel(new Error('No identity token returned from Apple.'))).toBe(false);
  });

  it('never throws on odd rejections', () => {
    for (const e of [undefined, null, 'canceled', 42, {}]) expect(isAppleSignInCancel(e)).toBe(false);
  });
});
