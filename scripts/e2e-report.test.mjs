import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, mergeSummaries } from './e2e-report.mjs';
const source = 'a'.repeat(40);
const result = () => ({ config: { metadata: { project: 'critical', shard: '1/2' } }, stats: { expected: 1, unexpected: 0, flaky: 1, skipped: 0, duration: 100 }, errors: [], suites: [{ file: 'board.spec.ts', specs: [{ file: 'board.spec.ts', title: 'durable card', tests: [{ status: 'flaky', results: [{ duration: 20 }, { duration: 30 }] }] }, { file: 'board.spec.ts', title: 'approval', tests: [{ status: 'expected', results: [{ duration: 10 }] }] }] }] });
test('reports distinguish first attempts, retry time, overhead and flaky results', () => {
  const s = summarize(result(), source);
  assert.equal(s.first_attempt_ms, 30); assert.equal(s.retry_ms, 30); assert.equal(s.setup_and_overhead_ms, 40); assert.equal(s.p95_first_attempt_ms, 20); assert.equal(s.flaky_rate, .5); assert.equal(s.passed, true);
});
test('required empty or failed reports cannot become a green aggregate', () => {
  assert.throws(() => summarize({ stats: { expected: 0, unexpected: 0, flaky: 0, skipped: 2, duration: 0 }, suites: [] }, source), /no passing/);
  const r = result(); r.stats.unexpected = 1; const s = summarize(r, source);
  assert.equal(s.passed, false); assert.throws(() => mergeSummaries([s], 1, source), /Unsuccessful/);
});
test('aggregate refuses missing, duplicate, foreign and incorrectly selected shards', () => {
  const a = summarize(result(), source), b = { ...a, shard: '2/2' };
  assert.throws(() => mergeSummaries([a], 2, source), /Missing/);
  assert.throws(() => mergeSummaries([a, a], 2, source), /Duplicate/);
  assert.throws(() => mergeSummaries([a, { ...b, source_commit: 'b'.repeat(40) }], 2, source), /foreign/);
  assert.throws(() => mergeSummaries([a, b], 2, source, { include: [{ project: 'extended', shard: 1, total: 2 }, { project: 'extended', shard: 2, total: 2 }] }), /identities/);
  assert.equal(mergeSummaries([a, b], 2, source, { include: [{ project: 'critical', shard: 1, total: 2 }, { project: 'critical', shard: 2, total: 2 }] }).passed, true);
});
