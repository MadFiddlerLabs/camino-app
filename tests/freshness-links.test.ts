/**
 * Regression: the monthly Freshness job failed every run from Sept to Nov 2026 and emailed Andrew,
 * yet every flagged link was alive. Government sites refused the bot (403), failed from the runner
 * (TLS, timeouts) or answered it with a false 404. judgeLink keeps the alarm for pages that are
 * really gone and reports the rest as unverified.
 */
import { describe, it, expect } from 'vitest';
import { judgeLink } from '../scripts/freshness-links';

const URL_A = 'https://www.example.gob.es/page';

describe('judgeLink', () => {
  it('a page that answers is ok', () => {
    expect(judgeLink(URL_A, 200)).toBe('ok');
  });

  it('404 and 410 are dead: the alarm still fires for a page that moved', () => {
    expect(judgeLink(URL_A, 404)).toBe('dead');
    expect(judgeLink(URL_A, 410)).toBe('dead');
  });

  it('a refusal, a server error or no answer is unverified, not dead', () => {
    for (const status of [401, 403, 429, 500, 503, null]) expect(judgeLink(URL_A, status)).toBe('unverified');
  });

  it('a 404 from a host that gives runners false 404s is unverified', () => {
    expect(judgeLink('https://www.comunidad.madrid/atencion-contribuyente/patrimonio', 404)).toBe('unverified');
  });
});
