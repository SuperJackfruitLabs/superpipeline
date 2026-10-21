import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function plan(paths, { full = false } = {}) {
  const result = { app: false, docs: false, landing: false, extended: false, full };
  if (!Array.isArray(paths) || paths.length === 0) result.full = true;
  for (const path of paths ?? []) {
    if (/^(docs-site\/|docs\/|README\.md$|CHANGELOG\.md$)/.test(path)) result.docs = true;
    else if (path.startsWith('landing/')) result.landing = true;
    else if (path.startsWith('apps/web/')) { result.app = true; result.extended = true; }
    else if (/^(apps\/api\/|packages\/)/.test(path)) result.app = true;
    else result.full = true; // Unknown/shared/build/lock/config changes never narrow coverage.
  }
  if (result.full) result.app = result.docs = result.landing = result.extended = true;
  const include = result.app ? [1, 2].map(shard => ({ project: 'critical', shard, total: 2 })) : [];
  if (result.extended || result.full) include.push(...[1, 2, 3, 4].map(shard => ({ project: 'extended', shard, total: 4 })));
  return { ...result, matrix: { include: include.length ? include : [{ project: 'critical', shard: 1, total: 2 }] } };
}

export function gate(needs, expected) {
  for (const [name, selected] of Object.entries(expected)) {
    const status = needs[name]?.result;
    if (status !== (selected ? 'success' : 'skipped')) throw new Error(`${name}: expected ${selected ? 'success' : 'skipped'}, received ${status}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv[2] === 'gate') {
    const needs = JSON.parse(process.env.CI_NEEDS);
    const p = needs.plan;
    if (p?.result !== 'success') throw new Error('CI plan did not succeed');
    const selected = key => {
      if (!['true', 'false'].includes(p.outputs[key])) throw new Error(`Missing plan output ${key}`);
      return p.outputs[key] === 'true';
    };
    gate(needs, process.argv[3] === 'test'
      ? { unit: selected('app'), docs: selected('docs'), landing: selected('landing') }
      : { build: selected('app'), smoke: selected('app'), browser: selected('app') });
  } else {
    let paths;
    const base = process.env.CI_BASE;
    try {
      if (!/^[a-f0-9]{40}$/.test(base ?? '') || /^0+$/.test(base)) throw new Error('Unknown base');
      paths = execFileSync('git', ['diff', '--name-only', '-z', '--no-renames', `${base}...HEAD`], { encoding: 'utf8' }).split('\0').filter(Boolean);
    } catch { paths = null; }
    const p = plan(paths, { full: ['schedule', 'workflow_dispatch'].includes(process.env.CI_EVENT) });
    for (const [key, value] of Object.entries(p)) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}\n`);
    console.log(JSON.stringify({ paths, plan: p }));
  }
}
