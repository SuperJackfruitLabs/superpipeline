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
// DEV-MODE PLANES ONLY. The spec seeds a realistic world through POST /v1/dev/fixture and signs in
// with dev headers, so the target must run with DEV_AUTH and FIXTURE_IMPORT on: a dev stack, never
// a deployed staging (there the fixture route deletes a tenant by id with no sign-in). Before
// seeding, `preflight` asks the target read-only (GET /v1/dev/fixture: 405 when the route is on,
// a 404 or the web app otherwise; the route answers a GET before reading anything) and stops with
// one line when the route is not there. Never enable fixture import on a plane to make this pass.
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

/** Ask the target, read-only, whether it is a dev-mode plane. Resolves null when it is, else the reason it is not. */
export async function preflight(url, fetchImpl = fetch) {
  const probe = new URL('/v1/dev/fixture', url).href;
  const refuse = (why) => `${url} is not a dev-mode plane (${why}): the composition audit seeds a fixture world and signs in with dev headers, so it runs only against a dev stack with DEV_AUTH and FIXTURE_IMPORT on. Never enable fixture import on a deployed plane to make it pass.`;
  let res;
  try { res = await fetchImpl(probe, { method: 'GET', redirect: 'manual' }); } catch (e) { return refuse(`GET ${probe} failed: ${e.message}`); }
  return res.status === 405 ? null : refuse(`GET ${probe} answered ${res.status}, not 405`);
}

function readRows(json) {
  try { return collect(JSON.parse(readFileSync(json, 'utf8'))); } catch { return []; }
}

/** One audit. Returns the report's path and its rows; throws (writing nothing, running nothing) when the target is refused. */
export async function audit({ url, date, outDir, json, fetchImpl = fetch, spawn = spawnSync }) {
  if (!json) {
    if (!url) throw new Error('STAGING_URL is not set: define the repository variable to run the audit');
    const refused = await preflight(url, fetchImpl);
    if (refused) throw new Error(refused);
    json = join(root, 'apps/web/test-results/composition-audit.json');
    runPlaywright(json, url, spawn);
  }
  const rows = readRows(json);
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `composition-audit-${date}.md`);
  writeFileSync(file, render(rows, { date, url: url ?? '(from-json)' }));
  return { file, rows };
}

async function main() {
  const { file, rows } = await audit({
    url: process.env.STAGING_URL,
    date: arg('--date') ?? new Date().toISOString().slice(0, 10),
    outDir: resolve(arg('--out') ?? join(root, 'docs/reviews')),
    json: arg('--from-json'),
  });
  console.log(file);
  if (!rows.length) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
