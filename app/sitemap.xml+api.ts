/**
 * GET /sitemap.xml — generated from the catalog so it can never drift from the real
 * guide pages. Only public, indexable routes belong here (/plan and /interview are app
 * surfaces, not content). /how-i-was-built went public 3 Jul 2026 (user decision).
 * L2: every fully-localized public page also lists its /<locale>/ variant (how-it-works
 * and the homework pages stay English-only, so no variants for them).
 */
import { CATALOG } from '@/core/engine-controller';
import { EXTRA_PERSONAS } from '@/core/sample-personas';
import { QUESTIONS } from '@/core/questions';
import { siteOrigin } from '@/lib/serverEmail';
import { WEB_LOCALES } from '@/lib/serverLocale';

export function GET(request: Request): Response {
  const base = siteOrigin(request);
  const localized = [
    '/', '/sample-plan', '/guide',
    '/privacy', '/terms', '/aviso-legal',
    ...EXTRA_PERSONAS.map(p => `/sample-plan/${p.id}`),
    ...CATALOG.map(o => `/guide/${o.id}`),
  ];
  // /how-it-works redirects home since 2026-07-10 (content folded into the landing page)
  // /contact is one route localized client-side (no per-locale static tree), so it lists once.
  const englishOnly = ['/contact', '/changelog', '/questions', '/status',
    ...QUESTIONS.map(q => `/questions/${q.slug}`),
    '/how-i-was-built', '/how-i-was-built/log', '/how-i-was-built/roadmap'];
  const urls = [
    ...localized,
    ...englishOnly,
    ...WEB_LOCALES.flatMap(l => localized.map(u => `/${l}${u === '/' ? '' : u}`)),
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${base}${u}</loc></url>`).join('\n') +
    `\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
