import { readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const percentile = (values, p) => values.length ? [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(p * values.length) - 1)] : 0;
export function summarize(report, source) {
  if (!report.stats || !Array.isArray(report.suites) || !/^[a-f0-9]{40}$/.test(source)) throw new Error('Missing valid Playwright report or source');
  const observations = [];
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
      const results = test.results ?? [];
      observations.push({ file: spec.file ?? suite.file, title: spec.title, outcome: test.status, first_ms: results[0]?.duration ?? 0, retry_ms: results.slice(1).reduce((n, r) => n + r.duration, 0), attempts: results.length });
    }
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites) visit(suite);
  const stats = report.stats;
  if (!Number.isFinite(stats.duration) || stats.duration < 0 || !Number.isInteger(stats.expected) || !Number.isInteger(stats.unexpected) || !Number.isInteger(stats.flaky) || !Number.isInteger(stats.skipped)) throw new Error('Incomplete Playwright result statistics');
  if (!observations.length || stats.expected + stats.flaky === 0) throw new Error('A required shard executed no passing tests');
  if (observations.some((o) => !o.file || !Number.isFinite(o.first_ms) || o.first_ms < 0 || !Number.isFinite(o.retry_ms) || o.retry_ms < 0)) throw new Error('Invalid test duration data');
  const byFile = new Map();
  for (const o of observations) {
    const file = byFile.get(o.file) ?? { file: o.file, first_ms: 0, retry_ms: 0, tests: 0 };
    file.first_ms += o.first_ms; file.retry_ms += o.retry_ms; file.tests++; byFile.set(o.file, file);
  }
  const meta = report.config?.metadata ?? {};
  const first = observations.map((o) => o.first_ms), first_ms = first.reduce((a, b) => a + b, 0), retry_ms = observations.reduce((n, o) => n + o.retry_ms, 0);
  return { version: 1, source_commit: source, project: meta.project ?? 'local', shard: meta.shard ?? '1/1',
    passed: stats.unexpected === 0 && !(report.errors?.length), expected: stats.expected, failed: stats.unexpected, flaky: stats.flaky, skipped: stats.skipped,
    elapsed_ms: stats.duration, first_attempt_ms: first_ms, retry_ms, setup_and_overhead_ms: Math.max(0, stats.duration - first_ms - retry_ms),
    p50_first_attempt_ms: percentile(first, .5), p95_first_attempt_ms: percentile(first, .95),
    flaky_rate: stats.flaky / (stats.expected + stats.flaky + stats.unexpected),
    slowest_files: [...byFile.values()].sort((a, b) => b.first_ms + b.retry_ms - a.first_ms - a.retry_ms).slice(0, 15) };
}
export function mergeSummaries(summaries, expected, source, matrix) {
  if (!Number.isInteger(expected) || expected < 1 || summaries.length !== expected) throw new Error('Missing or extra required shard summaries');
  const identities = new Set();
  for (const s of summaries) {
    if (s.version !== 1 || s.source_commit !== source || s.passed !== true || s.failed !== 0 || s.expected + s.flaky < 1) throw new Error('Unsuccessful or foreign-source shard');
    const id = s.project + '-' + s.shard;
    if (!/^(critical|extended)-[1-9]\d*\/[1-9]\d*$/.test(id) || identities.has(id)) throw new Error('Duplicate or invalid shard identity');
    identities.add(id);
  }
  if (matrix) {
    const required = matrix.include.map((x) => `${x.project}-${x.shard}/${x.total}`);
    if (required.length !== expected || required.some((id) => !identities.has(id))) throw new Error('Required shard identities do not match the CI plan');
  }
  const sum = (key) => summaries.reduce((n, s) => n + s[key], 0);
  return { version: 1, source_commit: source, passed: true, shards: summaries.length, expected: sum('expected'), flaky: sum('flaky'), skipped: sum('skipped'), first_attempt_ms: sum('first_attempt_ms'), retry_ms: sum('retry_ms'), slowest_shard_ms: Math.max(...summaries.map((s) => s.elapsed_ms)), shard_results: summaries };
}
function findSummaries(dir) {
  const paths = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry), stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error('Report symlinks are not supported');
    if (stat.isDirectory()) paths.push(...findSummaries(path));
    else if (entry === 'summary.json') paths.push(path);
  }
  return paths;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), value = (key) => {
    const index = args.indexOf(key);
    return index < 0 ? undefined : args[index + 1];
  };
  const source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const output = value('--output');
  if (!output) throw new Error('An output path is required');
  const summary = args.includes('--merge')
    ? mergeSummaries(findSummaries(value('--merge')).map((path) => JSON.parse(readFileSync(path, 'utf8'))), Number(value('--expected')), source, process.env.SP_E2E_MATRIX ? JSON.parse(process.env.SP_E2E_MATRIX) : undefined)
    : summarize(JSON.parse(readFileSync(value('--input'), 'utf8')), source);
  mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\nE2E: ${summary.expected} passed; ${summary.flaky} flaky; retry work ${Math.round(summary.retry_ms / 1000)}s.\n`);
  if (!summary.passed) process.exitCode = 1;
}
