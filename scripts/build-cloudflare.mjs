// Turns `expo export --platform web` output (dist/client + dist/server) into a Cloudflare Workers
// upload: dist/cloudflare/assets (static files) and dist/cloudflare/worker (code). See
// cloudflare/worker.mjs and wrangler.jsonc.
//
// Why split: the free Workers plan caps the worker at a few MB, and dist/server is ~27 MB because
// it holds every pre-rendered page. Pre-rendered pages don't need code, so they become static
// assets. The worker keeps only what the Expo request handler must run or read.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const client = path.join(dist, 'client');
const server = path.join(dist, 'server');
const out = path.join(dist, 'cloudflare');
const assets = path.join(out, 'assets');
const worker = path.join(out, 'worker');

if (!fs.existsSync(client) || !fs.existsSync(server)) {
  console.error('[build-cloudflare] dist/client or dist/server missing; run `expo export --platform web` first.');
  process.exit(1);
}
fs.rmSync(out, { recursive: true, force: true });

// A page served by code, not as a file: dynamic routes ([id], [...rest]) and +not-found.
const isWorkerHtml = (rel) => /\[.*\]/.test(rel) || path.basename(rel) === '+not-found.html';

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full)];
  });
}
function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

// 1. Static assets: everything in dist/client, plus each pre-rendered page from dist/server.
fs.cpSync(client, assets, { recursive: true });
let pages = 0;
for (const rel of walk(server)) {
  if (rel.startsWith('_expo' + path.sep) || !rel.endsWith('.html') || isWorkerHtml(rel)) continue;
  copy(path.join(server, rel), path.join(assets, rel));
  pages++;
}

// Headers EAS Hosting used to set. HSTS on every asset; Apple requires JSON for the
// app-site-association file (it has no extension); Metro's static bundles are content-hashed.
fs.writeFileSync(path.join(assets, '_headers'), `/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

/.well-known/apple-app-site-association
  Content-Type: application/json

/_expo/static/*
  Cache-Control: public, max-age=31536000, immutable
`);

// 2. Worker: the entry, the routes manifest, the API functions and the worker-served pages.
copy(path.join(root, 'cloudflare', 'worker.mjs'), path.join(worker, 'index.mjs'));
let code = 0;
for (const rel of walk(server)) {
  const isExpo = rel.startsWith('_expo' + path.sep) && !rel.endsWith('.map');
  if (!isExpo && !(rel.endsWith('.html') && isWorkerHtml(rel))) continue;
  copy(path.join(server, rel), path.join(worker, 'server', rel));
  code++;
}

console.log(`[build-cloudflare] assets: client + ${pages} pages; worker: ${code} files`);
