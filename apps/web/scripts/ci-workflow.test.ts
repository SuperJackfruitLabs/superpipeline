// The CI workflow parses, every `needs` names a job that exists, every script a step runs exists, and the
// gates are the ones the operator chose (2026-10-13): deploy waits on `visual`, never on the `pixel` report.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../../../', import.meta.url));
type Step = { run?: string; uses?: string; if?: string; id?: string };
type Job = { needs?: string | string[]; if?: string; steps: Step[]; 'continue-on-error'?: boolean; container?: { image: string; options?: string } };
const wf = parse(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8')) as { on: Record<string, unknown>; jobs: Record<string, Job> };
const needs = (j: Job) => (j.needs === undefined ? [] : Array.isArray(j.needs) ? j.needs : [j.needs]);

describe('ci.yml', () => {
  it('every needs resolves', () => {
    for (const [name, job] of Object.entries(wf.jobs)) for (const n of needs(job)) expect(wf.jobs[n], `${name} needs ${n}`).toBeDefined();
  });
  it('every script a step runs exists', () => {
    for (const job of Object.values(wf.jobs))
      for (const s of job.steps) for (const m of (s.run ?? '').matchAll(/(apps\/web\/scripts\/[\w/.-]+\.(?:mjs|sh))/g)) expect(existsSync(join(root, m[1]!)), m[1]).toBe(true);
  });
  it('deploy waits on test, e2e and visual, not on pixel', () => {
    expect(needs(wf.jobs.deploy!).sort()).toEqual(['e2e', 'test', 'visual']);
  });
  it('visual is blocking and runs base versus head in the Playwright image', () => {
    const v = wf.jobs.visual!;
    expect(v['continue-on-error']).toBeFalsy();
    expect(v.container?.image).toMatch(/^mcr\.microsoft\.com\/playwright:v[\d.]+-jammy$/);
    expect(v.container?.options).toBe('--ipc=host');
    expect(v.steps.some((s) => /scripts\/visual\/base-vs-head\.sh/.test(s.run ?? ''))).toBe(true);
    const up = v.steps.find((s) => s.uses?.startsWith('actions/upload-artifact'));
    expect(up?.uses).toBe('actions/upload-artifact@v4');
    expect(up?.if).toMatch(/github\.server_url == 'https:\/\/github\.com'/);
  });
  it('pixel is a report: never blocks, scoped by a step output, nightly at 03:30 UTC', () => {
    const p = wf.jobs.pixel!;
    expect(p['continue-on-error']).toBe(true);
    expect(wf.on.schedule).toEqual([{ cron: '30 3 * * *' }]);
    expect(p.steps.find((s) => s.id === 'scope')?.run).toMatch(/design-inputs\.mjs/);
    const run = p.steps.find((s) => /test:pixel/.test(s.run ?? ''));
    expect(run?.if).toMatch(/steps\.scope\.outputs\.run == 'true'/);
    expect(wf.on).not.toHaveProperty('pull_request.paths');
  });
  it('the image tag matches the guard argument in both container jobs', () => {
    for (const j of ['visual', 'pixel']) {
      const tag = wf.jobs[j]!.container!.image.split(':')[1];
      expect(wf.jobs[j]!.steps.some((s) => (s.run ?? '').includes(`image-guard.sh ${tag}`)), j).toBe(true);
    }
  });
  it('the schedule runs only the pixel report', () => {
    for (const j of ['test', 'e2e', 'visual']) expect(wf.jobs[j]!.if, j).toMatch(/github\.event_name != 'schedule'/);
  });
});
