// Builds the Cloudflare Worker secrets file from an `eas env:pull` file, so EAS stays the one
// place server secrets are stored. Prints variable NAMES only, never values.
//
//   node scripts/cloudflare-secrets.mjs <pulled .env file> <output .json file>
//
// Why a custom parser: eas env:pull writes GOOGLE_PLAY_INTEGRITY_SA_KEY as unquoted JSON over
// several lines, which dotenv-style parsers cut at the first line. Here a line that doesn't start
// with NAME= continues the previous value.
import fs from 'node:fs';

const [src, dest] = process.argv.slice(2);
if (!src || !dest) {
  console.error('usage: node scripts/cloudflare-secrets.mjs <pulled .env> <out .json>');
  process.exit(1);
}

// Build-time only; the Worker never needs it.
const SKIP = new Set(['SENTRY_AUTH_TOKEN']);

const vars = {};
let current = null;
for (const line of fs.readFileSync(src, 'utf8').split('\n')) {
  const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line);
  if (m) {
    current = m[1];
    vars[current] = m[2];
  } else if (current && line !== '') {
    vars[current] += '\n' + line;
  }
}
for (const [k, v] of Object.entries(vars)) {
  const q = /^(["'])([\s\S]*)\1$/.exec(v);
  vars[k] = q ? q[2] : v;
}

// The Play Integrity key must survive as JSON, or Android attestation fails closed.
if (vars.GOOGLE_PLAY_INTEGRITY_SA_KEY) {
  try {
    const j = JSON.parse(vars.GOOGLE_PLAY_INTEGRITY_SA_KEY);
    if (!j.client_email || !j.private_key) throw new Error('missing fields');
  } catch (e) {
    console.error(`[cloudflare-secrets] GOOGLE_PLAY_INTEGRITY_SA_KEY is not a valid service-account JSON (${e.message}).`);
    process.exit(1);
  }
}

const out = Object.fromEntries(Object.entries(vars).filter(([k]) => !SKIP.has(k)));
fs.writeFileSync(dest, JSON.stringify(out), { mode: 0o600 });
console.log(`[cloudflare-secrets] ${Object.keys(out).length} vars: ${Object.keys(out).sort().join(' ')}`);
