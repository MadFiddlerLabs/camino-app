/**
 * Pure health-status logic for /api/status + /status.
 *
 * Kept UI- and fetch-free so it's unit-testable: the route does the network I/O and the
 * page does the rendering; both lean on `overall()` to decide the single source of truth
 * — is the product healthy, and what HTTP code should an uptime monitor see?
 *
 * The point of the whole feature: ONE endpoint that checks everything the live product
 * depends on and 503s if any critical piece is down, so a single external uptime monitor
 * (Sentry's free tier allows one) alerts on the entire stack instead of just one URL.
 */
export type CheckStatus = 'ok' | 'down';

export type Check = {
  name: string;
  critical: boolean; // a critical failure takes the whole product "down" (→ 503)
  status: CheckStatus;
  latencyMs: number | null;
  detail?: string;
};

/** The overall verdict + the HTTP code an uptime checker should receive. */
export function overall(checks: Check[]): { status: CheckStatus; httpStatus: 200 | 503 } {
  const criticalDown = checks.some((c) => c.critical && c.status === 'down');
  return criticalDown ? { status: 'down', httpStatus: 503 } : { status: 'ok', httpStatus: 200 };
}

/**
 * Whether a fetched response counts as healthy.
 *  - 'ok': needs a 2xx (a real health endpoint that returns success, e.g. GoTrue /health).
 *  - 'reachable': any non-5xx means the service is up (e.g. PostgREST root answers 200/401/403
 *    depending on the anon role, all of which prove it's serving).
 */
export function responseHealthy(res: { ok: boolean; status: number }, mode: 'ok' | 'reachable'): boolean {
  return mode === 'ok' ? res.ok : res.status > 0 && res.status < 500;
}
