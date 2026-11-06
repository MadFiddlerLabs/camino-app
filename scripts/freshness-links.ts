/**
 * What one source-URL check proves, for the freshness alarm (scripts/freshness-check.ts).
 *
 * From a GitHub runner, Spanish government sites often refuse or fail a live page: all 16 links
 * flagged on 1 Nov 2026 were alive, and the job had failed every month without one moved page.
 * Only a 404 or 410 says a page is gone. A 403, a 5xx, a timeout or a TLS error says the site
 * wouldn't answer us, so that link is unverified: reported, but not an alarm.
 */
export type LinkVerdict = 'ok' | 'dead' | 'unverified';

// Hosts that answer a GitHub runner with 404 for live pages. comunidad.madrid did this on every
// run from Sept to Nov 2026, while the same URLs returned 200 from a normal connection.
export const RUNNER_FALSE_404_HOSTS = new Set(['www.comunidad.madrid']);

/** `status` is the HTTP status, or null when the request never got one. */
export function judgeLink(url: string, status: number | null): LinkVerdict {
  if (status === null) return 'unverified';
  if (status < 400) return 'ok';
  if (status !== 404 && status !== 410) return 'unverified';
  return RUNNER_FALSE_404_HOSTS.has(new URL(url).hostname) ? 'unverified' : 'dead';
}
