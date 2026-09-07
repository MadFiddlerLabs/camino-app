import { describe, it, expect } from 'vitest';
import { overall, responseHealthy, type Check } from '../lib/status';

// /api/status is the single URL one uptime monitor watches, so the critical invariant is:
// any CRITICAL check down ⇒ overall "down" ⇒ HTTP 503 (an outage trips the alert), while a
// non-critical failure never takes the whole product down. `responseHealthy` decides per-check.
const chk = (over: Partial<Check>): Check => ({ name: 'x', critical: true, status: 'ok', latencyMs: 1, ...over });

describe('overall', () => {
  it('is ok/200 when every check is ok', () => {
    expect(overall([chk({}), chk({ name: 'y' })])).toEqual({ status: 'ok', httpStatus: 200 });
  });

  it('is down/503 when a critical check is down', () => {
    expect(overall([chk({}), chk({ name: 'db', status: 'down' })])).toEqual({ status: 'down', httpStatus: 503 });
  });

  it('stays ok/200 when only a NON-critical check is down', () => {
    expect(overall([chk({}), chk({ name: 'email', critical: false, status: 'down' })])).toEqual({ status: 'ok', httpStatus: 200 });
  });

  it('is ok/200 for an empty set (nothing known-broken)', () => {
    expect(overall([])).toEqual({ status: 'ok', httpStatus: 200 });
  });
});

describe('responseHealthy', () => {
  it("'ok' mode needs a 2xx", () => {
    expect(responseHealthy({ ok: true, status: 200 }, 'ok')).toBe(true);
    expect(responseHealthy({ ok: false, status: 401 }, 'ok')).toBe(false);
    expect(responseHealthy({ ok: false, status: 503 }, 'ok')).toBe(false);
  });

  it("'reachable' mode treats any non-5xx as up (401/403/200), 5xx + no-response as down", () => {
    expect(responseHealthy({ ok: true, status: 200 }, 'reachable')).toBe(true);
    expect(responseHealthy({ ok: false, status: 401 }, 'reachable')).toBe(true);
    expect(responseHealthy({ ok: false, status: 403 }, 'reachable')).toBe(true);
    expect(responseHealthy({ ok: false, status: 502 }, 'reachable')).toBe(false);
    expect(responseHealthy({ ok: false, status: 0 }, 'reachable')).toBe(false);
  });
});
