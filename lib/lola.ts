/**
 * Client helper for the server-side Lola/Anthropic proxy (`app/api/lola+api.ts`).
 *
 * Replaces the old client-side `@anthropic-ai/sdk` calls so no API key ships to the
 * browser. On web the request is same-origin (relative URL). For native builds later,
 * set EXPO_PUBLIC_API_URL to the deployed origin so the relative path resolves.
 */

import { type LolaMode, type LolaParams } from '@/lib/lolaPrompts';
import { challengeDismissed, getSessionToken } from '@/lib/turnstile';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

// A stuck request must never become a stuck spinner (build-28 family finding: 30+s of
// spinner mid-interview). Normal turns answer in 1–4s; anything past this is dead.
const TIMEOUT_MS = 35_000;

export type LolaMessage = { role: 'user' | 'assistant'; content: string };

// The user pressed Cancel on the visible security check, so there is no session and the server
// would answer 401. That is a choice, not a failure: callers show their normal retry message but
// don't report it to Sentry (GETCAMINO-V, 2026-10-29: a translated Android Chrome page).
export class ChallengeDismissedError extends Error {
  constructor() {
    super('security check dismissed');
    this.name = 'ChallengeDismissedError';
  }
}

// C2a: the client sends a mode + typed params, never a raw `system`/`model`. The server
// (app/api/lola+api.ts → lib/lolaPrompts.ts) owns the prompt, model, and token cap.
export async function askAnthropic<M extends LolaMode>(opts: {
  mode: M;
  params: LolaParams[M];
  messages: LolaMessage[];
}): Promise<string> {
  // C2b: attach the Turnstile-derived session token on web (solved once, cached). null on native
  // and where Turnstile isn't configured — the server only enforces where it's set up.
  // Acquired BEFORE the abort timer starts: interactive means the visible challenge fallback can
  // appear here, and however long the user takes to solve it must not count against the fetch.
  const session = await getSessionToken({ interactive: true });
  if (!session && challengeDismissed()) throw new ChallengeDismissedError();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/api/lola`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(session ? { 'x-camino-session': session } : {}) },
      body: JSON.stringify({ mode: opts.mode, params: opts.params, messages: opts.messages }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`lola proxy ${res.status}`);
    const data = (await res.json()) as { text?: string };
    return data.text ?? '';
  } finally {
    clearTimeout(t);
  }
}
