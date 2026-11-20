// apps/web/scripts/e2e-shard.mjs — one CI browser shard, balanced by test count, whole spec files only.
//
// Playwright's --shard cuts the suite into contiguous slices of tests and gives each file (one group, since
// fullyParallel is off) to the slice where it starts. A file bigger than a slice pushes its neighbours past the
// next boundary, and a shard can end up with nothing (extended 3/4 held 0 of 337 tests), which the report step
// rightly refuses. Here the files are dealt to the shards by size instead (largest first, each to the shard with
// the fewest tests so far), so no shard is empty while there are at least as many files as shards, and each shard
// runs its files in Playwright's own order.
//
// Usage (CI's browser job): node scripts/e2e-shard.mjs --project=<name> --shard=<n>/<total> [playwright args...]
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Tests per spec file, in the order Playwright lists them, from `playwright test --list --reporter=json`. */
const count = (s) => (s.specs ?? []).reduce((n, sp) => n + (sp.tests?.length ?? 0), 0) + (s.suites ?? []).reduce((n, c) => n + count(c), 0);
export function testsPerFile(report) {
  return (report.suites ?? []).map((s) => ({ file: s.file, tests: count(s) })).filter((f) => f.tests > 0);
}

/** The files of each shard: largest first, each to the lightest shard (ties to the lower shard); each shard keeps the listed order. */
export function planShards(files, total) {
  if (!Number.isInteger(total) || total < 1) throw new Error(`a shard total must be a whole number from 1: ${total}`);
  const load = Array.from({ length: total }, () => 0);
  const bins = Array.from({ length: total }, () => []);
  const order = files.map((f, i) => ({ ...f, i })).toSorted((a, b) => b.tests - a.tests || a.i - b.i);
  for (const f of order) {
    const to = load.indexOf(Math.min(...load));
    load[to] += f.tests;
    bins[to].push(f);
  }
  return bins.map((b) => b.toSorted((x, y) => x.i - y.i).map((f) => ({ file: f.file, tests: f.tests })));
}

/** A CLI filter that matches exactly this spec file (Playwright reads each argument as a regex over the path). */
export const fileFilter = (file) => `[/\\\\]${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const project = args.find((a) => a.startsWith('--project='))?.slice('--project='.length);
  const shard = args.find((a) => a.startsWith('--shard='))?.slice('--shard='.length);
  const m = /^(\d+)\/(\d+)$/.exec(shard ?? '');
  if (!project || !m) throw new Error('usage: e2e-shard.mjs --project=<name> --shard=<n>/<total> [playwright args...]');
  const [n, total] = [Number(m[1]), Number(m[2])];
  if (n < 1 || n > total) throw new Error(`no shard ${n} of ${total}`);
  const rest = args.filter((a) => !a.startsWith('--shard='));

  const list = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['exec', 'playwright', 'test', '--list', `--project=${project}`, '--reporter=json'], {
    cwd: join(here, '..'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SP_E2E_REPORT: '' },
  });
  if (list.status !== 0) throw new Error(`playwright --list failed:\n${list.stderr}`);
  const files = testsPerFile(JSON.parse(list.stdout));
  const mine = planShards(files, total)[n - 1];
  if (mine.length === 0) throw new Error(`${project} shard ${n}/${total} has no spec files: the project has ${files.length} files for ${total} shards`);
  console.log(`${project} shard ${n}/${total}: ${mine.reduce((s, f) => s + f.tests, 0)} tests in ${mine.map((f) => f.file).join(', ')}`);

  const child = spawn(process.execPath, [join(here, 'e2e-run.mjs'), ...rest, ...mine.map((f) => fileFilter(f.file))], { stdio: 'inherit', env: process.env });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try { main(); } catch (e) { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; }
}
