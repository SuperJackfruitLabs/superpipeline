#!/usr/bin/env node
// apps/web/scripts/pixel/check-lock-change.mjs <base> — CI: references.lock may change only in a
// range whose commits say why (`Reference-Change:` trailer). Pairs with references-lock.test.ts, which
// fails when a protected file changes without the lock.
import { execFileSync } from 'node:child_process';
import { chooseBase } from './lock-base.mjs';
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const base = chooseBase(process.argv[2], () => git('merge-base', 'origin/main', 'HEAD'));
const changed = git('diff', '--name-only', `${base}...HEAD`).split('\n');
if (!changed.includes('apps/web/e2e/pixel/references.lock')) process.exit(0);
const bodies = git('log', '--format=%B%x00', `${base}..HEAD`);
if (/^Reference-Change: .+/m.test(bodies)) { console.log('references.lock changed with a stated reason'); process.exit(0); }
console.error('references.lock changed but no commit in the range carries a "Reference-Change: <why>" trailer.\n' +
  'Fix the app to match the reference; references, thresholds and masks change only in tasks whose purpose is to change them.');
process.exit(1);
