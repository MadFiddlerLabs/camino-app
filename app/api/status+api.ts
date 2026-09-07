/**
 * GET /api/status — aggregated product health.
 *
 * Backs the public /status page AND acts as the single URL an external uptime monitor
 * watches: it checks everything the LIVE product depends on and returns 503 if any
 * critical piece is down, so one monitor covers the whole stack (Sentry's free tier
 * only allows one uptime monitor). Checks run in parallel with a per-check timeout.
 *
 * It probes whatever Supabase the app is actually pointed at (EXPO_PUBLIC_SUPABASE_URL),
 * so it follows the hosted → self-hosted cutover automatically — no code change needed.
 */
import { corsPreflight } from '@/lib/apiGuard';
import { overall, responseHealthy, type Check } from '@/lib/status';

export function OPTIONS(request: Request): Response {
  return corsPreflight(request);
}

const TIMEOUT_MS = 8000;

async function probe(
  name: string,
  critical: boolean,
  url: string,
  mode: 'ok' | 'reachable',
  headers?: Record<string, string>,
): Promise<Check> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    const latencyMs = Date.now() - t0;
    const healthy = responseHealthy(res, mode);
    return { name, critical, status: healthy ? 'ok' : 'down', latencyMs, detail: healthy ? undefined : `HTTP ${res.status}` };
  } catch {
    return { name, critical, status: 'down', latencyMs: Date.now() - t0, detail: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(): Promise<Response> {
  const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const headers = anon ? { apikey: anon } : undefined;

  // The web app / API is up if this handler is executing.
  const checks: Check[] = [{ name: 'Web app', critical: true, status: 'ok', latencyMs: 0 }];

  if (supabaseUrl) {
    const [auth, db] = await Promise.all([
      probe('Authentication', true, `${supabaseUrl}/auth/v1/health`, 'ok', headers),
      probe('Database', true, `${supabaseUrl}/rest/v1/`, 'reachable', headers),
    ]);
    checks.push(auth, db);
  }

  const { status, httpStatus } = overall(checks);
  const body = JSON.stringify({ status, checks, updatedAt: new Date().toISOString() });
  return new Response(body, {
    status: httpStatus,
    headers: {
      'content-type': 'application/json',
      // Let a CDN serve repeat hits (uptime pings, page loads) without re-probing every time.
      'cache-control': 'public, max-age=30, s-maxage=30',
      'access-control-allow-origin': '*',
    },
  });
}
