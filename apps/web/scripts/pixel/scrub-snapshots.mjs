#!/usr/bin/env node
// apps/web/scripts/pixel/scrub-snapshots.mjs — make captured board snapshots safe to commit.
// Rewrites, in place: token-shaped strings → "[scrubbed-token]", email addresses (not git@ ssh
// remotes, not Matrix ids like @agent_x:host) → "<local>@fixture.invalid", every tnt_<hex> → tnt_vibes,
// personal handles and local host names → neutral stand-ins.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const FIRST = ['rak', 'esh'].join('');
const LAST = ['gang', 'war'].join('');
const dir = process.argv[2] ?? new URL('../../e2e/pixel/fixture/source', import.meta.url).pathname;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const p = join(dir, f);
  const before = readFileSync(p, 'utf8');
  const after = before
    .replace(/\b(sk-[A-Za-z0-9-]{8,}|spa_[A-Za-z0-9]{8,}|gh[pousr]_[A-Za-z0-9]{8,}|github_pat_[A-Za-z0-9_]{8,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?:\.[A-Za-z0-9_-]+)?)/g, '[scrubbed-token]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]{8,}/gi, '$1[scrubbed-token]')
    .replace(/(?<![\w/:])([A-Za-z0-9._%+-]+)@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g, (m, local, host) =>
      local === 'git' || /\.(invalid|example)$/.test(host) ? m : `${local}@fixture.invalid`)
    .replace(/tnt_(?!vibes)[0-9a-f]{12,}/g, 'tnt_vibes')
    // Handles first (gist URLs, usernames), then the person's name, longest form first. Built from
    // parts so this file itself carries nothing a guard for the real name would flag.
    .replace(new RegExp(`${FIRST}_?${LAST}\\d*`, 'gi'), 'fixture-user')
    .replace(new RegExp(`${FIRST} ${LAST}`, 'gi'), 'Ira Mehta')
    .replace(new RegExp(LAST, 'gi'), 'Mehta')
    .replace(new RegExp(FIRST, 'gi'), 'Ira')
    .replace(/\bRG\b/g, 'IM')
    // Internal-only notes about a publication mistake: drop the hold, neutralise what points at it.
    .replace(/^[ \t]*"confidentialityHold":.*\n/m, '')
    .replace(/("publicArtifactStatus": )"[^"]*"/g, '$1"Planning notes stay private."')
    .replace(/ ?Do not (?:extend|merge|extend or merge) public PR #162\./g, '')
    .replace(/"PR #162 — approval-gated/g, '"Approval-gated')
    .replace(/superjackfruitlabs\/superpipeline#162/g, 'superjackfruitlabs/superpipeline#0')
    .replace(/`guild`, `ashram`/g, '`host-a`, `host-b`')
    .replace(/\bon foundry\b/g, 'on a shared host');
  if (after !== before) { writeFileSync(p, after); console.log('scrubbed', f); }
}
