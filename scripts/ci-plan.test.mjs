import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, gate } from './ci-plan.mjs';
test('docs and landing select independent checks', () => {
  assert.equal(plan(['docs-site/a.mdx']).app, false);
  assert.equal(plan(['landing/a.astro']).docs, false);
  assert.equal(plan(['docs/a.md', 'landing/a']).landing, true);
});
test('runtime and contract paths retain all blocking app checks', () => {
  for (const path of ['apps/api/src/auth.ts', 'packages/contract/a.ts']) {
    const p = plan([path]); assert.equal(p.app, true); assert.equal(p.matrix.include.length, 2);
  }
});
test('unknown, missing base, empty diff, lock and shared tooling fail broad', () => {
  for (const paths of [null, [], ['pnpm-lock.yaml'], ['.github/workflows/ci.yml'], ['scripts/a.mjs'], ['new-package/a']]) {
    const p = plan(paths); assert.equal(p.full, true); assert.equal(p.matrix.include.length, 6); assert.equal(p.docs, true);
  }
});
test('scheduled full suite includes critical and extended', () => assert.equal(plan(['README.md'], { full: true }).matrix.include.length, 6));
test('aggregate accepts only intentional skips and actual successes', () => {
  gate({ a: { result: 'success' }, b: { result: 'skipped' } }, { a: true, b: false });
  for (const result of ['failure', 'cancelled', 'skipped', undefined]) assert.throws(() => gate({ a: { result } }, { a: true }));
  assert.throws(() => gate({ a: { result: 'success' } }, { a: false }));
});
test('deleted and renamed paths remain conservative', () => {
  // --no-renames yields both source and destination paths; neither can hide risk.
  assert.equal(plan(['apps/api/removed.ts', 'docs-site/moved.md']).app, true);
  assert.equal(plan(['docs-site/removed.md', 'unexpected/moved.md']).full, true);
});

test('UI, CSS, browser readiness and matrix changes select extended without site builds', () => {
  for (const path of ['apps/web/src/a.svelte', 'apps/web/src/styles/a.css', 'apps/web/e2e/pixel/app.ts', 'apps/web/playwright.config.ts', 'apps/web/e2e/long-text.spec.ts']) {
    const p = plan([path]);
    assert.equal(p.app, true); assert.equal(p.extended, true); assert.equal(p.full, false);
    assert.equal(p.docs, false); assert.equal(p.landing, false); assert.equal(p.matrix.include.length, 6);
  }
});
