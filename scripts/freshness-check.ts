/**
 * The freshness alarm (🔁 freshness beat, builds on C6). Fails when a dated official fact has
 * gone stale past its class SLO, or when a source_url no longer resolves — so the "last verified"
 * stamps only mean something because a machine makes us keep them honest.
 *
 * Run offline (stamps only): `npm run freshness -- --no-net`
 * Run with link checks (the monthly CI job): `npm run freshness`
 *
 * Class SLOs: statutory/budget-law figures re-verify every ~180 days (they move each January);
 * procedural catalog steps every ~365 days. Exits non-zero on any staleness or dead link, which
 * fails the GitHub Action and emails the owner (see .github/workflows/freshness.yml). A link the
 * site wouldn't answer is listed as unverified and doesn't fail the job (scripts/freshness-links.ts);
 * the stamps still force a person to open every source within its SLO.
 */
import { CATALOG } from '../core/engine-controller';
import { verifiedOn } from '../core/changelog';
import { LEGAL_FIGURES } from '../core/legal-figures';
import { REGIONAL_SPECIFICS } from '../core/regional-specifics';
import { judgeLink, type LinkVerdict } from './freshness-links';

const DAY = 86_400_000;
const SLO = { statutory: 180, procedural: 365 } as const;

type Fact = { label: string; verified_at: string; source_url?: string; cls: keyof typeof SLO };

function collect(): Fact[] {
  const facts: Fact[] = [];
  for (const o of CATALOG)
    if (o.source === 'official')
      facts.push({ label: `catalog:${o.id}`, verified_at: verifiedOn(o), source_url: o.source_url, cls: 'procedural' });
  for (const [k, f] of Object.entries(LEGAL_FIGURES))
    facts.push({ label: `legal-figure:${k}`, verified_at: f.verified_at, source_url: f.source_url, cls: 'statutory' });
  for (const r of REGIONAL_SPECIFICS)
    facts.push({ label: `regional:${r.region}:${(r as { kind?: string }).kind ?? ''}`, verified_at: r.verified_at, source_url: r.source_url, cls: 'statutory' });
  return facts;
}

const ageDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY);

async function checkLink(url: string): Promise<{ verdict: LinkVerdict; why: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'GetCamino-FreshnessBot/1.0' } });
    return { verdict: judgeLink(url, res.status), why: `HTTP ${res.status}` };
  } catch (e) {
    return { verdict: judgeLink(url, null), why: `unreachable (${e instanceof Error ? e.message : 'error'})` };
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const noNet = process.argv.includes('--no-net');
  const facts = collect();
  const staleP: string[] = [];
  for (const f of facts) {
    const age = ageDays(f.verified_at);
    if (age > SLO[f.cls]) staleP.push(`  ⏰ STALE ${f.label} — verified ${f.verified_at} (${age}d, SLO ${SLO[f.cls]}d)`);
  }

  const deadP: string[] = [];
  const unverifiedP: string[] = [];
  if (!noNet) {
    const urls = [...new Set(facts.map(f => f.source_url).filter((u): u is string => !!u))];
    process.stdout.write(`[freshness] checking ${urls.length} source URLs...\n`);
    const results = await Promise.all(urls.map(async u => ({ u, ...(await checkLink(u)) })));
    for (const { u, verdict, why } of results) {
      if (verdict === 'dead') deadP.push(`  🔗 DEAD ${u} — ${why}`);
      if (verdict === 'unverified') unverifiedP.push(`  ❔ UNVERIFIED ${u} — ${why}`);
    }
  }

  const oldest = facts.reduce((a, b) => (ageDays(a.verified_at) >= ageDays(b.verified_at) ? a : b));
  process.stdout.write(`\n[freshness] ${facts.length} dated facts · oldest stamp: ${oldest.label} @ ${oldest.verified_at} (${ageDays(oldest.verified_at)}d)\n`);

  if (unverifiedP.length) {
    process.stdout.write(`\n[freshness] ${unverifiedP.length} links wouldn't answer this runner, so they weren't checked:\n`);
    unverifiedP.forEach(l => process.stdout.write(l + '\n'));
  }

  if (staleP.length || deadP.length) {
    process.stdout.write(`\n❌ freshness check FAILED — re-verify these against their official source:\n`);
    [...staleP, ...deadP].forEach(l => process.stdout.write(l + '\n'));
    process.exit(1);
  }
  process.stdout.write(`✓ freshness OK — every dated fact is within its SLO${noNet ? ' (links not checked: --no-net)' : ' and no checked source URL is gone'}.\n`);
}

main();
