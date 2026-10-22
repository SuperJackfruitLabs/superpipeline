// The CI workflow parses, every `needs` names a job that exists, every script a step runs exists, and the
// gates are the ones the operator chose (2026-10-13): production deploy waits on `visual`, never on the `pixel` report,
// (since 2026-10-22 production deploys from release.yml on a v* tag, gated on main's CI run for that commit)
// and (2026-10-14) pixel runs only nightly or by hand, never on push or pull_request.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../../../', import.meta.url));
type Step = { run?: string; uses?: string; if?: string; id?: string; env?: Record<string, string>; with?: Record<string, unknown> };
type Job = { needs?: string | string[]; if?: string; steps: Step[]; 'continue-on-error'?: boolean; container?: { image: string; options?: string }; strategy?: { 'max-parallel'?: number; 'fail-fast'?: boolean; matrix?: string } };
const wf = parse(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8')) as { on: Record<string, unknown>; jobs: Record<string, Job> };
const rel = parse(readFileSync(join(root, '.github/workflows/release.yml'), 'utf8')) as { jobs: Record<string, Job & { permissions?: Record<string, string> }> };
const needs = (j: Job) => (j.needs === undefined ? [] : Array.isArray(j.needs) ? j.needs : [j.needs]);

describe('ci.yml', () => {
  it('every needs resolves', () => {
    for (const [name, job] of Object.entries(wf.jobs)) for (const n of needs(job)) expect(wf.jobs[n], `${name} needs ${n}`).toBeDefined();
  });
  it('every script a step runs exists', () => {
    for (const job of Object.values(wf.jobs))
      for (const s of job.steps) for (const m of (s.run ?? '').matchAll(/(apps\/web\/scripts\/[\w/.-]+\.(?:mjs|sh))/g)) expect(existsSync(join(root, m[1]!)), m[1]).toBe(true);
  });
  it('main has no production deploy; a v* tag deploys it from release.yml', () => {
    expect(wf.jobs.deploy).toBeUndefined();
    for (const job of Object.values(wf.jobs)) expect(JSON.stringify(job)).not.toContain('ci:deploy-app');
    expect(rel.jobs['deploy-production']).toBeDefined();
  });
  it('production deploy requires main CI test, e2e and visual to have passed, not pixel', () => {
    const d = rel.jobs['deploy-production']!;
    expect(needs(d)).toEqual([]); // independent of the CLI release
    expect(d.permissions?.actions).toBe('read');
    const onMain = d.steps.find((s) => s.run?.includes('merge-base --is-ancestor'));
    expect(onMain?.run).toContain('origin/main');
    const gate = d.steps.find((s) => s.id === 'ci')!;
    for (const j of ['"test"', '"e2e"', '"visual"']) expect(gate.run).toContain(j);
    expect(gate.run).not.toContain('pixel');
    expect(gate.run).toContain('workflows/ci.yml/runs?event=push&branch=main&head_sha=');
    expect(gate.run).toContain("has not passed test/e2e/visual");
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
  it('pixel is a report: never blocks, runs only nightly at 03:30 UTC or by hand (2026-10-14)', () => {
    const p = wf.jobs.pixel!;
    expect(p['continue-on-error']).toBe(true);
    expect(wf.on.schedule).toEqual([{ cron: '30 3 * * *' }]);
    expect(wf.on).toHaveProperty('workflow_dispatch');
    // Not on push or pull_request: on those events the job is skipped, so it cannot starve test/e2e/visual.
    expect(p.if?.replace(/\s+/g, ' ')).toBe("github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'");
    expect(p.steps.some((s) => /design-inputs\.mjs/.test(s.run ?? ''))).toBe(false);
    expect(p.steps.some((s) => /test:pixel/.test(s.run ?? ''))).toBe(true);
    expect(p.steps.some((s) => /drift-summary\.mjs/.test(s.run ?? ''))).toBe(true);
    expect(wf.on).not.toHaveProperty('pull_request.paths');
  });
  it('the image tag matches the guard argument in both container jobs', () => {
    for (const j of ['visual', 'pixel', 'browser', 'smoke']) {
      const tag = wf.jobs[j]!.container!.image.split(':')[1];
      expect(wf.jobs[j]!.steps.some((s) => (s.run ?? '').includes(`image-guard.sh ${tag}`)), j).toBe(true);
    }
  });
  it('manual and nightly events reach the full-plan selector and browser jobs', () => {
    const select = wf.jobs.plan!.steps.find((s) => s.id === 'select');
    expect(select?.env?.CI_EVENT).toBe('${{ github.event_name }}');
    expect(wf.jobs.browser!.if).toBe("needs.plan.outputs.app == 'true'");
    expect(wf.jobs.browser!.strategy?.matrix).toBe('${{ fromJSON(needs.plan.outputs.matrix) }}');
    expect(wf.jobs.visual!.if).toMatch(/github\.event_name != 'schedule'/);
  });
  it('required job names always aggregate actual dependencies and run the fail-closed gate', () => {
    for (const name of ['test', 'e2e']) {
      const job = wf.jobs[name]!;
      expect(job.if).toBe('always()');
      expect(job['continue-on-error']).toBeFalsy();
      const gate = job.steps.find((s) => s.run === `node scripts/ci-plan.mjs gate ${name}`);
      expect(gate?.env?.CI_NEEDS).toBe('${{ toJSON(needs) }}');
    }
    expect(needs(wf.jobs.test!).sort()).toEqual(['docs', 'landing', 'plan', 'unit']);
    expect(needs(wf.jobs.e2e!).sort()).toEqual(['browser', 'build', 'plan', 'smoke']);
  });
  it('bounded shards retain reports and validate exact expected identities', () => {
    const browser = wf.jobs.browser!;
    expect(browser.strategy?.['max-parallel']).toBe(2);
    expect(browser.strategy?.['fail-fast']).toBe(false);
    const run = browser.steps.find((s) => s.run?.includes('--shard='));
    expect(run?.run).toContain('--workers=1');
    expect(run?.env?.SP_E2E_PROJECT).toBe('${{ matrix.project }}');
    expect(run?.env?.SP_E2E_SHARD).toBe('${{ matrix.shard }}/${{ matrix.total }}');
    const merge = wf.jobs.e2e!.steps.find((s) => s.run?.includes('--merge'));
    expect(merge?.env?.SP_E2E_MATRIX).toBe('${{ needs.plan.outputs.matrix }}');
    expect(merge?.env?.EXPECTED).toContain("needs.plan.outputs.extended == 'true'");
  });
  it('smoke, shards and deploy verify the same artifact without rebuilding', () => {
    expect(wf.jobs.build!.steps.some((s) => s.run === 'pnpm ci:build-app')).toBe(true);
    const prod = rel.jobs['deploy-production']!;
    for (const [name, job, artifact] of [
      ['smoke', wf.jobs.smoke!, 'app-${{ github.sha }}'],
      ['browser', wf.jobs.browser!, 'app-${{ github.sha }}'],
      ['deploy-production', prod, 'app-${{ steps.commit.outputs.sha }}'],
    ] as const) {
      expect(job.steps.some((s) => s.uses?.includes('download-artifact') && s.with?.name === artifact), name).toBe(true);
      expect(job.steps.some((s) => s.run?.includes('pnpm ci:verify-app')), name).toBe(true);
      expect(job.steps.some((s) => s.run?.includes('ci:build-app')), name).toBe(false);
    }
    const dl = prod.steps.find((s) => s.id === 'download')!;
    expect(dl.with?.['run-id']).toBe('${{ steps.ci.outputs.run_id }}');
    expect(dl.with?.['github-token']).toBe('${{ github.token }}');
    expect(prod.steps.find((s) => s.if === "steps.download.outcome != 'success'")?.run).toContain('exit 1');
    expect(prod.steps.some((s) => s.run === 'pnpm ci:deploy-app')).toBe(true);
    expect(prod.steps.some((s) => s.run?.includes('smoke.sh https://app.superpipeline.dev'))).toBe(true);
    expect(wf.jobs.unit!.steps.some((s) => s.run === 'pnpm ci:test')).toBe(true);
  });
  it('Forge retains artifacts using pinned compatible actions; visual no-capture retains an outcome', () => {
    for (const name of ['build', 'browser', 'smoke', 'visual', 'pixel']) {
      const upload = wf.jobs[name]!.steps.find((s) => s.uses === './.github/actions/forgejo-upload-artifact');
      expect(upload?.if).toContain("github.server_url != 'https://github.com'");
      expect(upload?.with?.['if-no-files-found']).toBe('error');
    }
    for (const dir of ['forgejo-upload-artifact', 'forgejo-download-artifact']) {
      const action = readFileSync(join(root, `.github/actions/${dir}/action.yml`), 'utf8');
      expect(action, dir).toMatch(/uses: https:\/\/code\.forgejo\.org\/actions\/[a-z-]+-artifact@[a-f0-9]{40}\n/);
    }
    // GitHub resolves every remote action at job setup, skipped steps included, and cannot
    // resolve a URL; only a local action is loaded when its step runs.
    expect(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8')).not.toContain('uses: https://');
    expect(wf.jobs.visual!.steps.some((s) => s.if === 'always()' && s.run?.includes('outcome.json'))).toBe(true);
    expect(wf.jobs.visual!.steps.find((s) => s.id === 'compare')?.run).toContain('pipefail');
  });
  it('hidden report directories are explicit on GitHub without unsupported Forge inputs', () => {
    for (const name of ['smoke', 'browser']) {
      const steps = wf.jobs[name]!.steps;
      const github = steps.find((s) => s.uses === 'actions/upload-artifact@v4');
      const forge = steps.find((s) => s.uses === './.github/actions/forgejo-upload-artifact');
      expect(github?.with?.path).toBe('.ci/reports');
      expect(github?.with?.['include-hidden-files']).toBe(true);
      expect(forge?.with).not.toHaveProperty('include-hidden-files');
    }
    for (const name of ['deploy-docs', 'deploy-landing']) {
      const deploy = wf.jobs[name]!.steps.find((s) => s.run?.includes('pages deploy'));
      expect(deploy?.run).toContain('npx --yes wrangler@4.103.0 pages deploy');
    }
  });

});
