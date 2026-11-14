import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, gate } from './ci-plan.mjs';
void test('docs-only changes select only docs checks', () => {
  for (const paths of [
    ['README'],
    ['README.md'],
    ['README.markdown'],
    ['README.txt'],
    ['README.rst'],
    ['docs/a.md'],
    ['docs-site/a.mdx'],
    ['README.md', 'docs/a.md', 'docs-site/a.mdx'],
  ]) {
    const p = plan(paths);
    assert.deepEqual(
      { app: p.app, docs: p.docs, landing: p.landing, full: p.full },
      { app: false, docs: true, landing: false, full: false },
    );
  }
});
void test('anything other than docs-only retains the full suite', () => {
  for (const paths of [
    ['apps/api/src/auth.ts'],
    ['packages/contract/a.ts'],
    ['docs/a.md', 'apps/api/src/auth.ts'],
    ['CHANGELOG.md'],
    ['.github/workflows/ci.yml'],
    ['pnpm-lock.yaml'],
  ]) {
    const p = plan(paths);
    assert.equal(p.full, true);
    assert.equal(p.app, true);
    assert.equal(p.matrix.include.length, 6);
  }
});
void test('unknown, missing base, empty diff, lock and shared tooling fail broad', () => {
  for (const paths of [null, [], ['pnpm-lock.yaml'], ['.github/workflows/ci.yml'], ['scripts/a.mjs'], ['new-package/a']]) {
    const p = plan(paths); assert.equal(p.full, true); assert.equal(p.matrix.include.length, 6); assert.equal(p.docs, true);
  }
});
void test('scheduled full suite includes critical and extended', () => assert.equal(plan(['README.md'], { full: true }).matrix.include.length, 6));
void test('aggregate accepts docs-only skips while requiring docs success', () => {
  const p = plan(['docs/guide.md']);
  gate(
    {
      unit: { result: 'skipped' },
      lint: { result: 'skipped' },
      docs: { result: 'success' },
      landing: { result: 'skipped' },
    },
    { unit: p.app, lint: p.app, docs: p.docs, landing: p.landing },
  );
});
void test('aggregate accepts only intentional skips and actual successes', () => {
  gate({ a: { result: 'success' }, b: { result: 'skipped' } }, { a: true, b: false });
  for (const result of ['failure', 'cancelled', 'skipped', undefined]) assert.throws(() => gate({ a: { result } }, { a: true }));
  assert.throws(() => gate({ a: { result: 'success' } }, { a: false }));
});
void test('deleted and renamed paths remain conservative', () => {
  // --no-renames yields both source and destination paths; neither can hide risk.
  assert.equal(plan(['apps/api/removed.ts', 'docs-site/moved.md']).app, true);
  assert.equal(plan(['docs-site/removed.md', 'unexpected/moved.md']).full, true);
});

void test('UI, CSS, browser readiness and matrix changes retain the full suite', () => {
  for (const path of ['apps/web/src/a.svelte', 'apps/web/src/styles/a.css', 'apps/web/e2e/pixel/app.ts', 'apps/web/playwright.config.ts', 'apps/web/e2e/long-text.spec.ts']) {
    const p = plan([path]);
    assert.equal(p.app, true); assert.equal(p.extended, true); assert.equal(p.full, true);
    assert.equal(p.docs, true); assert.equal(p.landing, true); assert.equal(p.matrix.include.length, 6);
  }
});
