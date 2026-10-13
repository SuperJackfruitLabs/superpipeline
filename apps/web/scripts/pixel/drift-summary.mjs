#!/usr/bin/env node
// apps/web/scripts/pixel/drift-summary.mjs <results.json> — one paragraph on how far the app has drifted
// from the approved mockups, for the end of the pixel conformance report's log. Never fails the job.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function summarise(rows) {
  if (!rows.length) return 'Pixel conformance: no screen was recorded (the run stopped before the report was written).';
  const count = (s) => rows.filter((r) => r.status === s).length;
  const errors = rows.filter((r) => r.error).length;
  const worst = rows.filter((r) => typeof r.ratio === 'number' && r.status !== 'pass')
    .sort((a, b) => b.ratio - a.ratio).slice(0, 5)
    .map((r) => `${r.artboard}·${r.theme} ${(r.ratio * 100).toFixed(2)}%`);
  return `Pixel conformance: ${rows.length} screens against the approved mockups; ${count('pass')} match, ${count('warn')} within the warning band, ` +
    `${count('expected-fail')} on the allow-list, ${count('fail') - errors} drifted past the bar${errors ? `, ${errors} did not render` : ''}.` +
    (worst.length ? ` Furthest: ${worst.join(', ')}.` : '') + ' This is a report, not a gate: the `visual` job guards regressions.';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const f = process.argv[2];
  console.log(summarise(f && existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : []));
}
