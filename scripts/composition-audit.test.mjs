import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audit, collect, preflight, render, runPlaywright, splitTitle } from './composition-audit.mjs';

const t = (status) => ({ status, results: [] });
const fixture = {
  suites: [{ file: 'composition.spec.ts', specs: [], suites: [{ specs: [
    { title: 'inbox: 1 one composition', tests: [t('expected')] },
    { title: 'inbox: 7 one primary action', tests: [t('unexpected')] },
    { title: 'board: 1 one composition', tests: [t('flaky')] },
    { title: 'no convention here', tests: [t('skipped')] },
  ] }] }],
};

void test('splits titles at the first ": "', () => {
  assert.deepEqual(splitTitle('inbox: 7 a: b'), { page: 'inbox', rule: '7 a: b' });
  assert.deepEqual(splitTitle('plain'), { page: '(ungrouped)', rule: 'plain' });
});

void test('collects verdicts from nested suites', () => {
  assert.deepEqual(collect(fixture).map((r) => r.verdict), ['pass', 'FAIL', 'pass (flaky)', 'skipped']);
});

void test('renders pass/fail per rule per page', () => {
  const md = render(collect(fixture), { date: '2026-12-01', url: 'https://staging.example' });
  assert.match(md, /^# Composition audit 2026-12-01/);
  assert.match(md, /2 pass, 1 failing, 1 skipped, of 4 checks/);
  assert.match(md, /## inbox\n\n1 of 2 pass\n\n\| Rule \| Result \|\n\| --- \| --- \|\n\| 1 one composition \| pass \|\n\| 7 one primary action \| FAIL \|/);
  assert.match(md, /## board[\s\S]*\| 1 one composition \| pass \(flaky\) \|/);
  assert.match(md, /## \(ungrouped\)/);
});

void test('a board with a flaky pass and a skip counts them apart', () => {
  const md = render(collect(fixture), { date: 'd', url: 'u' });
  assert.match(md, /Result: 2 pass, 1 failing, 1 skipped, of 4 checks\./);
});

void test('zero tests says why', () => {
  assert.match(render([], { date: 'd', url: 'u' }), /no tests ran \(the spec is missing or Playwright failed\)/);
});

void test('a stale result is removed before the run, and a spawn error throws', () => {
  const json = join(mkdtempSync(join(tmpdir(), 'ca-')), 'r.json');
  writeFileSync(json, '{"stale":true}');
  runPlaywright(json, 'https://x', () => ({ status: 1 }));
  assert.equal(existsSync(json), false);
  assert.throws(() => runPlaywright(json, 'https://x', () => ({ error: new Error('ENOENT') })), /did not start/);
});

const answers = (status) => async () => ({ status });

void test('the preflight asks read-only and passes only a plane whose fixture route is on', async () => {
  const seen = [];
  const fetchImpl = async (u, init) => { seen.push([u, init.method]); return { status: 405 }; };
  assert.equal(await preflight('https://dev.example', fetchImpl), null);
  assert.deepEqual(seen, [['https://dev.example/v1/dev/fixture', 'GET']]);
});

void test('a target without the fixture route is refused before anything is seeded or written', async () => {
  for (const [fetchImpl, why] of [[answers(404), /answered 404, not 405/], [answers(200), /answered 200, not 405/], [async () => { throw new Error('ENOTFOUND'); }, /failed: ENOTFOUND/]]) {
    const outDir = mkdtempSync(join(tmpdir(), 'ca-'));
    let spawned = false;
    await assert.rejects(
      audit({ url: 'https://staging.example', date: 'd', outDir, fetchImpl, spawn: () => { spawned = true; return { status: 0 }; } }),
      (e) => why.test(e.message) && /only against a dev stack/.test(e.message) && /Never enable fixture import/.test(e.message),
    );
    assert.equal(spawned, false);
    assert.deepEqual(readdirSync(outDir), []);
  }
});

void test('a dev-mode plane passes the preflight and the audit runs', async () => {
  const outDir = mkdtempSync(join(tmpdir(), 'ca-'));
  let spawned = false;
  await audit({ url: 'https://dev.example', date: 'd', outDir, fetchImpl: answers(405), spawn: () => { spawned = true; return { status: 0 }; } });
  assert.equal(spawned, true);
  assert.deepEqual(readdirSync(outDir), ['composition-audit-d.md']);
});
