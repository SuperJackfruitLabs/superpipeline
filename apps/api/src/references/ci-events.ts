/**
 * CI results from a webhook, for machine checks (charter: decisions/2026-11-09-a-gate-may-be-decided-
 * by-checks.md, decision 6). Pure and total: null for anything that is not a CI result.
 *
 * Each result names a repository, a commit, a context and a state. Which card it concerns is decided
 * by the board: the head commit of a pull request a card links to (`headSha`, recorded from
 * `pull_request` events by github-events.ts and forge-events.ts).
 *
 * **GitHub** (the `webhooks/github` door):
 * - `status`: the commit status API — `sha`, `context`, `state`, `target_url`.
 * - `check_run`: one check — `check_run.name` is the context, `head_sha`, `status`/`conclusion`.
 * - `check_suite`: one app's whole suite — the context is the app's name (`check_suite.app.name`).
 * - `workflow_run`: one Actions workflow — the context is the workflow's name.
 *
 * **Forgejo / Gitea** (the `webhooks/forge` door):
 * - `status`: Gitea's commit status event, the same shape as GitHub's (`sha`, `context`, `state`,
 *   `target_url`). Taken whenever a forge sends it.
 * - `action_run_success`, `action_run_failure`, `action_run_recover`: Forgejo's Actions run
 *   notifications. The context is the run's workflow file (`run.workflow_id`, e.g. `ci.yml`), the
 *   commit `run.commit_sha`, the link `run.html_url`.
 * - `workflow_run_success`, `workflow_run_failure`, `workflow_run_cancelled`, `workflow_run_skipped`,
 *   `workflow_run_running`, `workflow_run_waiting`, `workflow_run_blocked`: newer Forgejo's
 *   per-state run events, with the same `run` payload.
 * - `workflow_job_*` is not read: a job is a part of a run, and naming both would report one
 *   workflow twice under two contexts.
 */

export type CiState = 'pending' | 'success' | 'failure';

export interface CiResult {
  /** `owner/repo`, lowercased, as card references spell it. */
  repo: string;
  sha: string;
  context: string;
  state: CiState;
  url: string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function record(v: unknown): Record<string, unknown> | null {
  return isRecord(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

function repoOf(payload: Record<string, unknown>, ...more: Array<Record<string, unknown> | null>): string | null {
  for (const holder of [payload, ...more]) {
    const name = str(record(holder?.repository)?.full_name);
    if (name) return name.toLowerCase();
  }
  return null;
}

/** A commit status's state: `pending`, `success`, or one of the failing ones. */
function statusState(v: unknown): CiState | null {
  if (v === 'pending') return 'pending';
  if (v === 'success') return 'success';
  // `warning` is Gitea's: a commit that did not succeed is not green.
  if (v === 'failure' || v === 'error' || v === 'warning') return 'failure';
  return null;
}

/** A check run, suite or workflow run: not finished is pending; a finished one by its conclusion. */
function conclusionState(status: unknown, conclusion: unknown): CiState | null {
  if (status !== 'completed') return typeof status === 'string' ? 'pending' : null;
  // `neutral` and `skipped` do not hold a merge on GitHub, so they do not hold a check either.
  if (conclusion === 'success' || conclusion === 'neutral' || conclusion === 'skipped') return 'success';
  if (typeof conclusion === 'string') return 'failure';
  return null;
}

function result(repo: string | null, sha: unknown, context: unknown, state: CiState | null, url: unknown): CiResult | null {
  const s = str(sha);
  const c = str(context);
  if (!repo || !s || !c || !state) return null;
  return { repo, sha: s.toLowerCase(), context: c, state, url: str(url) };
}

function commitStatus(p: Record<string, unknown>): CiResult | null {
  return result(repoOf(p), p.sha, p.context, statusState(p.state), p.target_url);
}

export function mapGithubCiEvent(event: string, payload: unknown): CiResult | null {
  const p = record(payload);
  if (!p) return null;
  if (event === 'status') return commitStatus(p);
  if (event === 'check_run') {
    const run = record(p.check_run);
    if (!run) return null;
    return result(repoOf(p), run.head_sha, run.name, conclusionState(run.status, run.conclusion), run.html_url ?? run.details_url);
  }
  if (event === 'check_suite') {
    const suite = record(p.check_suite);
    if (!suite) return null;
    return result(repoOf(p), suite.head_sha, record(suite.app)?.name, conclusionState(suite.status, suite.conclusion), suite.url);
  }
  if (event === 'workflow_run') {
    const run = record(p.workflow_run);
    if (!run) return null;
    return result(repoOf(p), run.head_sha, run.name, conclusionState(run.status, run.conclusion), run.html_url);
  }
  return null;
}

const FORGE_RUN_STATES: Readonly<Record<string, CiState>> = {
  action_run_success: 'success',
  action_run_recover: 'success',
  action_run_failure: 'failure',
  workflow_run_success: 'success',
  workflow_run_skipped: 'success',
  workflow_run_failure: 'failure',
  workflow_run_cancelled: 'failure',
  workflow_run_running: 'pending',
  workflow_run_waiting: 'pending',
  workflow_run_blocked: 'pending',
};

export function mapForgeCiEvent(event: string, payload: unknown): CiResult | null {
  const p = record(payload);
  if (!p) return null;
  if (event === 'status') return commitStatus(p);
  const state = Object.hasOwn(FORGE_RUN_STATES, event) ? FORGE_RUN_STATES[event] : undefined;
  if (state === undefined) return null;
  const run = record(p.run);
  if (!run) return null;
  return result(repoOf(p, run), run.commit_sha, run.workflow_id, state, run.html_url);
}
