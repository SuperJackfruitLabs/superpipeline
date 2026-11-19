// Monthly composition audit. Runs apps/web/e2e/composition.spec.ts against STAGING_URL and writes
// docs/reviews/composition-audit-<YYYY-MM-DD>.md: pass/fail per rule per page.
//
// Usage:  STAGING_URL=https://... node scripts/composition-audit.mjs [--date YYYY-MM-DD] [--out DIR] [--from-json FILE]
//   --from-json  skip Playwright and render a report from an existing Playwright JSON result.
//
// TITLE CONVENTION (the spec's test titles must follow it): "<page>: <rule>", split at the FIRST
// ": ". Example: "inbox: 7 one primary action". The page is everything before, the rule everything
// after. A title without ": " is grouped under the page "(ungrouped)". Titles may sit inside
// describe blocks; only the spec title is read, not the suite path.
//
// The workflow (.github/workflows/composition-audit.yml) reads STAGING_URL from the repository
// variable of that name. The operator must define it; while it is unset the job skips with a note.
//
// Outcome per test: Playwright `status` of the spec's tests: expected = pass, unexpected = FAIL,
// flaky = pass (flaky), skipped = skipped. Exit code is 0 either way (the job is advisory); a
// missing/unparseable result, or zero tests, exits 1.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
export const SPEC = 'e2e/composition.spec.ts';
export const PROJECT = process.env.COMPOSITION_PROJECT || 'critical';

export function splitTitle(title) {
  const i = title.indexOf(': ');
  return i < 0 ? { page: '(ungrouped)', rule: title.trim() } : { page: title.slice(0, i).trim(), rule: title.slice(i + 2).trim() };
}

const VERDICT = { expected: 'pass', unexpected: 'FAIL', flaky: 'pass (flaky)', skipped: 'skipped' };

// Reads a Playwright JSON report; returns [{ page, rule, verdict }] in report order.
export function collect(report) {
  const rows = [];
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
      rows.push({ ...splitTitle(spec.title), verdict: VERDICT[test.status] ?? String(test.status) });
    }
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites ?? []) visit(suite);
  return rows;
}

export function render(rows, { date, url }) {
  const pages = new Map();
  for (const r of rows) pages.set(r.page, [...(pages.get(r.page) ?? []), r]);
  const failed = rows.filter((r) => r.verdict === 'FAIL').length;
  const skipped = rows.filter((r) => r.verdict === 'skipped').length;
  const passed = rows.length - failed - skipped;
  if (!rows.length) return `# Composition audit ${date}\n\nTarget: ${url}\n\nno tests ran (the spec is missing or Playwright failed)\n`;
  const lines = [
    `# Composition audit ${date}`,
    '',
    `Target: ${url}`,
    `Spec: apps/web/${SPEC} (project ${PROJECT})`,
    '',
    `Result: ${passed} pass, ${failed} failing, ${skipped} skipped, of ${rows.length} checks.`,
    '',
  ];
  for (const [page, list] of pages) {
    const ok = list.filter((r) => r.verdict.startsWith('pass')).length;
    lines.push(`## ${page}`, '', `${ok} of ${list.length} pass`, '', '| Rule | Result |', '| --- | --- |');
    for (const r of list) lines.push(`| ${r.rule.replaceAll('|', '\\|')} | ${r.verdict} |`);
    lines.push('');
  }
  return lines.join('\n');
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}

// Removes any earlier result first, so a Playwright that dies before writing cannot leave a stale
// report to be parsed. Playwright's non-zero exit is the report's content; failing to start is not.
export function runPlaywright(json, url, spawn = spawnSync) {
  rmSync(json, { force: true });
  mkdirSync(dirname(json), { recursive: true });
  const res = spawn('pnpm', ['--filter', '@superpipeline/web', 'exec', 'playwright', 'test', SPEC, `--project=${PROJECT}`, '--reporter=json'], {
    cwd: root, stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, SP_E2E_BASE_URL: url, PLAYWRIGHT_JSON_OUTPUT_NAME: json },
  });
  if (res.error) throw new Error(`Playwright did not start: ${res.error.message}`);
}

function readRows(json) {
  try { return collect(JSON.parse(readFileSync(json, 'utf8'))); } catch { return []; }
}

function main() {
  const url = process.env.STAGING_URL;
  const date = arg('--date') ?? new Date().toISOString().slice(0, 10);
  const outDir = resolve(arg('--out') ?? join(root, 'docs/reviews'));
  let json = arg('--from-json');
  if (!json) {
    if (!url) throw new Error('STAGING_URL is not set: define the repository variable to run the audit');
    json = join(root, 'apps/web/test-results/composition-audit.json');
    runPlaywright(json, url);
  }
  const rows = readRows(json);
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `composition-audit-${date}.md`);
  writeFileSync(file, render(rows, { date, url: url ?? '(from-json)' }));
  console.log(file);
  if (!rows.length) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try { main(); } catch (e) { console.error(e.message); process.exit(1); }
}
