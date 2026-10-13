#!/usr/bin/env node
// apps/web/scripts/pixel/record-expected-failures.mjs — rewrite expected-failures.ts from the last run's results.json.
// Used once, in Task 5, against today's app; afterwards the list only shrinks by hand.
import { readFileSync, writeFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync(new URL('../../test-results/pixel/results.json', import.meta.url), 'utf8'));
const keys = rows.filter((r) => r.status === 'fail' || r.status === 'expected-fail').map((r) => `${r.artboard}·${r.theme}`).sort();
writeFileSync(new URL('../../e2e/pixel/expected-failures.ts', import.meta.url),
`/**
 * Screens that do not match their reference yet. A ratchet: an entry that starts passing fails the
 * run until it is deleted here. Each screen task deletes its own keys; Task 41 deletes this file.
 */
export const EXPECTED_FAILURES: ReadonlySet<string> = new Set([
${keys.map((k) => `  '${k}',`).join('\n')}
]);
`);
console.log(`${keys.length} expected failures written`);
