#!/usr/bin/env node
// apps/web/scripts/pixel/design-inputs.mjs <event> [base] — CI: does this run need the pixel conformance
// report? Pushes and the nightly schedule always run it; a pull request only when it touches what the
// mockups were drawn from. Writes `run=true|false` to $GITHUB_OUTPUT (a step output, not workflow `paths:`,
// which would also skip the required jobs).
import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chooseBase } from './lock-base.mjs';

const DESIGN_INPUTS = [
  /^apps\/web\/vendor\//, // vibekit tarball (its CSS)
  /^apps\/web\/e2e\/reference\//,
  /^apps\/web\/e2e\/pixel\//,
  /^apps\/web\/src\/lib\/components\/shell\//,
  /^apps\/web\/src\/lib\/styles\/shell\//,
  /^apps\/web\/src\/app\.html$/,
];

export const touchesDesignInputs = (files) => files.some((f) => DESIGN_INPUTS.some((re) => re.test(f)));
export const shouldRunPixel = (event, files) => event !== 'pull_request' || touchesDesignInputs(files);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [event, arg] = process.argv.slice(2);
  const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
  const files = event === 'pull_request'
    ? git('diff', '--name-only', `${chooseBase(arg, () => git('merge-base', 'origin/main', 'HEAD'))}...HEAD`).split('\n').filter(Boolean)
    : [];
  const run = shouldRunPixel(event, files);
  console.log(run ? `pixel report: runs (${event})` : 'pixel report: skipped, this PR touches no design input');
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\n`);
}
