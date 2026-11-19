import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collect, render, splitTitle } from './composition-audit.mjs';

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
  assert.match(md, /3 of 4 checks without failure; 1 failing/);
  assert.match(md, /## inbox\n\n1 of 2 pass\n\n\| Rule \| Result \|\n\| --- \| --- \|\n\| 1 one composition \| pass \|\n\| 7 one primary action \| FAIL \|/);
  assert.match(md, /## board[\s\S]*\| 1 one composition \| pass \(flaky\) \|/);
  assert.match(md, /## \(ungrouped\)/);
});
