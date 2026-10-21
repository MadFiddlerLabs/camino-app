// Cloudflare Workers entry for the web app (replaces EAS Hosting, 2026-10).
//
// scripts/build-cloudflare.mjs copies this file to dist/cloudflare/worker/index.mjs, next to the
// parts of `expo export`'s dist/server that must run as code: the routes manifest, the API
// functions, the dynamic-route HTML templates and the not-found page. Every pre-rendered page and
// static file is a Workers static asset, served before this worker runs, so the worker only sees
// API calls, /sitemap.xml, dynamic routes and 404s.
import { createRequestHandler } from 'expo-server/adapter/workerd';

const handler = createRequestHandler({ build: './server' });

// EAS Hosting sent HSTS on every page; static assets get it from _headers, worker responses here.
const HSTS = 'max-age=31536000; includeSubDomains; preload';

export default {
  async fetch(request, env, ctx) {
    const response = await handler(request, env, ctx);
    const headers = new Headers(response.headers);
    headers.set('Strict-Transport-Security', HSTS);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
