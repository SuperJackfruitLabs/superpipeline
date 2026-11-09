/**
 * A gate may be decided by checks (charter: decisions/2026-11-09-a-gate-may-be-decided-by-checks.md).
 * Operator ruling: `ci` and `verdict` providers; checks run before people; a failing check returns
 * the card; overdue checks escalate; owners and admins may override.
 */
import { env, runInDurableObject, SELF } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { __resetJwksCacheForTests } from '../src/auth/hub-jwt';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import type { BoardDO, BoardInit } from '../src/board/board-do';
import { createDecisionTables } from '../src/board/schema-decisions';
import { internalStageEditor } from '../src/board/model';
import { boardStub as stubFor } from '../src/board/stub';
import { hmacSha256Hex } from '../src/crypto/hmac';
import { recordBoard } from '../src/db/catalog';
import { newId } from '../src/ids';
import type { ReporterFetch } from '../src/superwitness/client';
import { boardStub, payload, PRODUCER, STAGES as SUBJECT_STAGES } from './approval-subject-fixtures';
import { planeToken, withOrgPlane } from './helpers/org-plane';
import { HUB_URL, SW_URL, withReporting } from './helpers/superwitness';

type Stage = BoardInit['stages'][number];
const HOOK = 'https://hub.example/api/bridge/superpipeline/push';
const EVENTS = ['gate.pending', 'attention.pending', 'check.failed', 'check.overridden', 'decision.reminded', 'decision.escalated'];
const GH_SECRET = 'gh-secret';
const FORGE_SECRET = 'forge-secret';
const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const MIN = 60_000;
const plus = (minutes: number) => new Date(Date.now() + minutes * MIN).toISOString();

const CI = { name: 'build', provider: 'ci' as const, contexts: ['build'] };

/** build (agent) → review (human approval gate with checks) → ship (agent). */
function reviewStages(review: Partial<Stage> = {}): Stage[] {
  return [
    { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
    { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval', returnStage: 'build', checks: [CI], ...review },
    { key: 'ship', name: 'Ship', order: 2, ownerKind: 'capability', owner: 'ship' },
  ];
}

/** build (agent) → verify (decided by checks alone) → ship (agent). */
function checksGateStages(verify: Partial<Stage> = {}): Stage[] {
  return [
    { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
    { key: 'verify', name: 'Verify', order: 1, ownerKind: 'human', gate: 'checks', returnStage: 'build', checks: [CI], ...verify },
    { key: 'ship', name: 'Ship', order: 2, ownerKind: 'capability', owner: 'ship' },
  ];
}

interface Opened {
  cardId: string;
  runId: string;
}

/** A board with these stages, a push subscriber, a card linked to `org/repo#7`, built and completed. */
async function arrive(
  board: BoardDO,
  name: string,
  stages: Stage[],
  opts: { provider?: 'github' | 'forge'; headSha?: string; beforeComplete?: () => Promise<unknown> } = {},
): Promise<Opened> {
  await board.init({ id: `brd_${name}`, tenantId: 'tnt_mc', name: 'Checks', stages });
  await board.registerPushConfig({ agentId: 'agt_bridge', url: HOOK, token: 's', events: EVENTS });
  await board.setGithubSecret(GH_SECRET);
  await board.setForgeSecret(FORGE_SECRET);
  const made = await board.createCard({ title: 'Fix the build', ownerUserId: 'usr_owner' });
  if (!made.ok) throw new Error(made.message);
  const provider = opts.provider ?? 'github';
  const ref = await board.addReference({
    cardId: made.value.id,
    url: provider === 'github' ? 'https://github.com/org/repo/pull/7' : 'https://forge.example.test/org/repo/pulls/7',
    provider,
    sourceType: 'pull_request',
    externalId: 'org/repo#7',
  });
  if (!ref.ok) throw new Error(ref.message);
  if (opts.headSha) await pullRequest(board, provider, 'opened', opts.headSha);
  if (opts.beforeComplete) await opts.beforeComplete();
  const c = await board.claim({ agentId: 'agt_b', capabilities: ['build'] });
  if (!c.claimed) throw new Error('expected a build claim');
  const done = await board.complete({ runId: c.runId, leaseEpoch: c.leaseEpoch, handoff: { summary: 'fixed' } });
  if (!done.ok) throw new Error(done.message);
  return { cardId: made.value.id, runId: c.runId };
}

async function deliver(board: BoardDO, provider: 'github' | 'forge', event: string, body: unknown, signature?: string) {
  const rawBody = JSON.stringify(body);
  const hex = await hmacSha256Hex(provider === 'github' ? GH_SECRET : FORGE_SECRET, rawBody);
  const input = { rawBody, deliveryId: crypto.randomUUID(), event };
  return provider === 'github'
    ? board.handleGithubWebhook({ ...input, signature: signature ?? `sha256=${hex}` })
    : board.handleForgeWebhook({ ...input, signature: signature ?? hex });
}

const repository = { full_name: 'Org/Repo', default_branch: 'main' };

function pullRequest(board: BoardDO, provider: 'github' | 'forge', action: string, sha: string) {
  return deliver(board, provider, 'pull_request', {
    action,
    repository,
    pull_request: { number: 7, state: 'open', html_url: 'https://example.test/pr/7', base: { ref: 'main' }, head: { ref: 'fix', sha } },
  });
}

function status(board: BoardDO, provider: 'github' | 'forge', sha: string, context: string, state: string) {
  return deliver(board, provider, 'status', { sha, context, state, target_url: `https://ci.example.test/${context}`, repository });
}

const cardOf = async (board: BoardDO, cardId: string) => (await board.getState()).cards.find((c) => c.id === cardId);
const checksOf = async (board: BoardDO, cardId: string) => {
  const r = await board.cardChecks(cardId);
  if (!r.ok || r.value === null) throw new Error('no checks');
  return r.value;
};
const pushed = async (board: BoardDO, event: string): Promise<unknown[]> =>
  (await board.getPushDeliveries())
    .map((d): unknown => JSON.parse(d.body))
    .filter((b) => b !== null && typeof b === 'object' && 'event' in b && b.event === event);

describe('checks are decision policy', () => {
  it.each([
    ['without a returnStage', { returnStage: null }, /needs a returnStage/],
    ['more than five', { checks: Array.from({ length: 6 }, (_, i) => ({ name: `c${i}`, provider: 'ci' as const })) }, /1 to 5 checks/],
    ['two with one name', { checks: [CI, { name: 'build', provider: 'ci' as const }] }, /two checks named "build"/],
    ['an unknown provider', { checks: [JSON.parse('{"name":"x","provider":"coverage"}')] }, /provider must be "ci" or "verdict"/],
    ['a verdict with both bars', { checks: [{ name: 'v', provider: 'verdict' as const, kind: 'eval', atLeast: 0.8, pass: true as const }] }, /either atLeast/],
    ['a verdict with no bar', { checks: [{ name: 'v', provider: 'verdict' as const, kind: 'eval' }] }, /either atLeast/],
    ['a bad judge kind', { checks: [JSON.parse('{"name":"v","provider":"verdict","kind":"eval","pass":true,"judgeKinds":["robot"]}')] }, /judgeKinds/],
    ['on a stage with no gate', { gate: 'none' as const }, /gate must be "approval" or "checks"/],
    ['a name with a slash', { checks: [{ name: 'a/b', provider: 'ci' as const }] }, /without surrounding spaces or "\/"/],
  ])('refuses checks %s', async (label, extra, message) => {
    await runInDurableObject(boardStub(`mc-bad-${label}`), async (board: BoardDO) => {
      await board.init({ id: 'brd_bad', tenantId: 'tnt_mc', name: 'C', stages: reviewStages({ checks: undefined }) });
      const r = await board.updateStage('review', { gate: 'approval', checks: [CI], returnStage: 'build', ...extra }, internalStageEditor('test'));
      expect(r).toMatchObject({ ok: false, code: 'INVALID_STAGES' });
      expect(r.ok ? '' : r.message).toMatch(message);
    });
  });

  it('a checks gate needs checks, and no agent may own it', async () => {
    await runInDurableObject(boardStub('mc-bad-gate'), async (board: BoardDO) => {
      await board.init({ id: 'brd_bad', tenantId: 'tnt_mc', name: 'C', stages: checksGateStages({ checks: undefined, gate: 'none' }) });
      expect(await board.updateStage('verify', { gate: 'checks' }, internalStageEditor('test'))).toMatchObject({ ok: false, code: 'INVALID_STAGES' });
      const agentOwned = await board.updateStage('verify', { gate: 'checks', checks: [CI], ownerKind: 'capability', owner: 'verify' }, internalStageEditor('test'));
      expect(agentOwned.ok ? '' : agentOwned.message).toMatch(/no agent may own it/);
    });
  });

  it('only an owner or admin may set, change or remove checks, or make a stage decided by them', async () => {
    await runInDurableObject(boardStub('mc-policy'), async (board: BoardDO) => {
      await board.init({ id: 'brd_policy', tenantId: 'tnt_mc', name: 'C', stages: reviewStages({ checks: undefined }) });
      const member = { kind: 'person' as const, mayChangeDecisionPolicy: false };
      const admin = { kind: 'person' as const, mayChangeDecisionPolicy: true };
      expect(await board.updateStage('review', { checks: [CI] }, member)).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
      expect((await board.updateStage('review', { checks: [CI] }, admin)).ok).toBe(true);
      expect(await board.updateStage('review', { checks: [{ ...CI, contexts: ['build', 'lint'] }] }, member)).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
      expect(await board.updateStage('review', { checks: null }, member)).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
      expect(await board.updateStage('review', { gate: 'checks' }, member)).toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
      expect((await board.updateStage('review', { name: 'Review it' }, member)).ok).toBe(true);
    });
  });
});

describe('checks run before people', () => {
  it('no gate opens and nobody is asked until every check passes; then gate.pending carries the checks', async () => {
    await runInDurableObject(boardStub('mc-before-people'), async (board: BoardDO, state) => {
      const { cardId } = await arrive(board, 'before', reviewStages());
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'review', state: 'input-required', needsHuman: { reason: 'review', detail: 'waiting for checks' } });
      expect(await board.pendingGateDeliveries()).toEqual([]);
      expect(await pushed(board, 'gate.pending')).toEqual([]);
      expect(await pushed(board, 'attention.pending')).toEqual([]);
      expect((await checksOf(board, cardId)).checks).toMatchObject([{ name: 'build', provider: 'ci', status: 'pending' }]);

      await pullRequest(board, 'github', 'opened', SHA_A);
      await status(board, 'github', SHA_A, 'build', 'pending');
      expect(await board.pendingGateDeliveries()).toEqual([]);
      await status(board, 'github', SHA_A, 'build', 'success');

      const [gate] = await board.pendingGateDeliveries();
      expect(gate?.checks).toEqual([{ name: 'build', provider: 'ci', status: 'passed', url: 'https://ci.example.test/build' }]);
      const [push] = await pushed(board, 'gate.pending');
      expect(push).toMatchObject({ checks: [{ name: 'build', status: 'passed' }] });
      const read = await board.getGate(gate?.gateId ?? '');
      expect(read.ok ? read.value.checks : null).toEqual([{ name: 'build', provider: 'ci', status: 'passed', url: 'https://ci.example.test/build' }]);
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'review', needsHuman: { reason: 'review' } });
      expect(state.storage.sql.exec(`SELECT head_sha FROM card_checks`).one().head_sha).toBe(SHA_A);
    });
  });

  it('a stage without checks opens its gate exactly as before: no checks field anywhere', async () => {
    await runInDurableObject(boardStub('mc-plain'), async (board: BoardDO, state) => {
      const { cardId } = await arrive(board, 'plain', reviewStages({ checks: undefined, returnStage: undefined }));
      const [gate] = await board.pendingGateDeliveries();
      expect(gate).toBeDefined();
      expect(gate).not.toHaveProperty('checks');
      const read = await board.getGate(gate?.gateId ?? '');
      expect(read.ok && read.value).not.toHaveProperty('checks');
      expect(state.storage.sql.exec(`SELECT check_arrival_id FROM gates`).one().check_arrival_id).toBeNull();
      expect(state.storage.sql.exec(`SELECT COUNT(*) AS n FROM card_check_arrivals`).one().n).toBe(0);
      expect(await board.cardChecks(cardId)).toEqual({ ok: true, value: null });
    });
  });

  it('CI already green when the card arrives: the gate opens at once', async () => {
    await runInDurableObject(boardStub('mc-already-green'), async (board: BoardDO) => {
      const { cardId } = await arrive(board, 'green', reviewStages(), { headSha: SHA_A, beforeComplete: () => status(board, 'github', SHA_A, 'build', 'success') });
      expect((await checksOf(board, cardId)).checks[0]?.status).toBe('passed');
      expect(await board.pendingGateDeliveries()).toHaveLength(1);
    });
  });
});

describe('a gate that binds an approval subject', () => {
  it('freezes the subject at submission and binds it when the checks pass', async () => {
    await runInDurableObject(boardStub('mc-subject'), async (board: BoardDO, state) => {
      const stages = SUBJECT_STAGES.map((st) => (st.key === 'approve' ? { ...st, returnStage: 'draft', checks: [CI] } : st));
      await board.init({ id: 'brd_subject', tenantId: 'tnt_mc', name: 'C', stages });
      const made = await board.createCard({ title: 'Post', ownerUserId: 'usr_owner', projectId: 'prj_fixture' });
      if (!made.ok) throw new Error(made.message);
      const c = await board.claim({ agentId: PRODUCER, capabilities: ['writing'] });
      if (!c.claimed) throw new Error('no claim');
      expect(await board.complete({ runId: c.runId, leaseEpoch: c.leaseEpoch, handoff: { publicationPayload: payload() } })).toMatchObject({ ok: true });
      expect(state.storage.sql.exec(`SELECT COUNT(*) AS n FROM approval_subjects`).one().n).toBe(0);
      expect((await board.overrideCheck({ cardId: made.value.id, name: 'build', by: 'usr_admin', role: 'owner', comment: 'no CI for posts' })).ok).toBe(true);
      const subject = state.storage.sql.exec(`SELECT id, digest, producer_run_id, length(canonical_bytes) AS size FROM approval_subjects`).one();
      expect(subject).toMatchObject({ producer_run_id: c.runId, size: expect.any(Number) });
      expect(Number(subject.size)).toBeGreaterThan(100);
      const [gate] = await board.pendingGateDeliveries();
      const read = await board.getGate(gate?.gateId ?? '');
      expect(read.ok ? { id: read.value.approvalSubject?.id, digest: read.value.approvalSubject?.digest, checks: read.value.checks } : null).toEqual({
        id: subject.id,
        digest: subject.digest,
        checks: [{ name: 'build', provider: 'ci', status: 'overridden' }],
      });
      expect(state.storage.sql.exec(`SELECT active_approval_subject_id FROM cards`).one().active_approval_subject_id).toBe(subject.id);
    });
  });
});

describe('a stage decided by checks', () => {
  it('advances with no person when its checks pass', async () => {
    await runInDurableObject(boardStub('mc-checks-gate'), async (board: BoardDO) => {
      const { cardId } = await arrive(board, 'gate', checksGateStages(), { headSha: SHA_A });
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'verify', state: 'input-required' });
      expect(await board.claim({ agentId: 'agt_v', capabilities: ['verify'] })).toMatchObject({ claimed: false });
      await status(board, 'github', SHA_A, 'build', 'success');
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'ship', state: 'submitted' });
      expect((await board.getState()).gates).toEqual([]);
      expect(await pushed(board, 'gate.pending')).toEqual([]);
      expect((await checksOf(board, cardId)).status).toBe('passed');
    });
  });

  it('a checks gate on the last stage is not finished on arrival', async () => {
    await runInDurableObject(boardStub('mc-last'), async (board: BoardDO) => {
      const stages = checksGateStages().slice(0, 2);
      const { cardId } = await arrive(board, 'last', stages, { headSha: SHA_A });
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'verify', state: 'input-required' });
      await status(board, 'github', SHA_A, 'build', 'success');
      expect(await cardOf(board, cardId)).toMatchObject({ state: 'completed' });
    });
  });
});

describe('ci results by webhook', () => {
  it('GitHub check_run, check_suite and workflow_run', async () => {
    await runInDurableObject(boardStub('mc-gh-kinds'), async (board: BoardDO) => {
      const checks = [
        { name: 'run', provider: 'ci' as const, contexts: ['unit'] },
        { name: 'suite', provider: 'ci' as const, contexts: ['GitHub Actions'] },
        { name: 'wf', provider: 'ci' as const, contexts: ['CI'] },
      ];
      const { cardId } = await arrive(board, 'kinds', checksGateStages({ checks }), { headSha: SHA_A });
      await deliver(board, 'github', 'check_run', { action: 'completed', repository, check_run: { name: 'unit', head_sha: SHA_A, status: 'completed', conclusion: 'success', html_url: 'https://ci/unit' } });
      await deliver(board, 'github', 'check_suite', { action: 'completed', repository, check_suite: { head_sha: SHA_A, status: 'completed', conclusion: 'neutral', app: { name: 'GitHub Actions' } } });
      expect((await checksOf(board, cardId)).checks.map((c) => c.status)).toEqual(['passed', 'passed', 'pending']);
      await deliver(board, 'github', 'workflow_run', { action: 'in_progress', repository, workflow_run: { name: 'CI', head_sha: SHA_A, status: 'in_progress', conclusion: null } });
      expect((await checksOf(board, cardId)).checks[2]?.status).toBe('pending');
      await deliver(board, 'github', 'workflow_run', { action: 'completed', repository, workflow_run: { name: 'CI', head_sha: SHA_A, status: 'completed', conclusion: 'success', html_url: 'https://ci/wf' } });
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'ship' });
    });
  });

  it('a failing check_run returns the card with findings and pushes check.failed', async () => {
    await runInDurableObject(boardStub('mc-gh-fail'), async (board: BoardDO, state) => {
      const { cardId } = await arrive(board, 'fail', reviewStages({ checks: [{ name: 'build', provider: 'ci', contexts: ['unit'] }] }), { headSha: SHA_A });
      await deliver(board, 'github', 'check_run', { action: 'completed', repository, check_run: { name: 'unit', head_sha: SHA_A, status: 'completed', conclusion: 'failure', html_url: 'https://ci/unit/1' } });
      const card = await cardOf(board, cardId);
      expect(card).toMatchObject({ currentStageKey: 'build', state: 'submitted' });
      const handoff = state.storage.sql.exec(`SELECT handoff_json FROM cards WHERE id = ?`, cardId).one().handoff_json;
      expect(JSON.parse(typeof handoff === 'string' ? handoff : '{}')).toMatchObject({
        summary: 'fixed',
        returnedFrom: 'review',
        findings: `Check "build" (ci) failed: CI context "unit" failed on ${SHA_A.slice(0, 12)} — https://ci/unit/1`,
      });
      expect(await pushed(board, 'check.failed')).toEqual([
        {
          event: 'check.failed',
          boardId: 'brd_fail',
          cardId,
          cardTitle: expect.any(String),
          stageKey: 'review',
          arrivalId: expect.stringMatching(/./),
          check: { name: 'build', provider: 'ci', status: 'failed', detail: `CI context "unit" failed on ${SHA_A.slice(0, 12)}`, url: 'https://ci/unit/1' },
          returnedTo: 'build',
        },
      ]);
      expect(await board.pendingGateDeliveries()).toEqual([]);
      // The next submission runs the checks again, on a fresh arrival.
      const c = await board.claim({ agentId: 'agt_b', capabilities: ['build'] });
      if (!c.claimed) throw new Error('expected the rework claim');
      await board.complete({ runId: c.runId, leaseEpoch: c.leaseEpoch, handoff: { summary: 'fixed again' } });
      // Still failing on the same head: it goes straight back again.
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'build' });
      // Worded the same, but a different arrival: a carrier keyed on it says the second one too.
      const failures = await pushed(board, 'check.failed');
      expect(failures).toHaveLength(2);
      expect(failures[0]).toMatchObject({ cardTitle: 'Fix the build' });
      const arrivals = failures.map((f) => (typeof f === 'object' && f !== null && 'arrivalId' in f ? f.arrivalId : null));
      expect(new Set(arrivals).size).toBe(2);
    });
  });

  it('Forgejo status and action runs', async () => {
    await runInDurableObject(boardStub('mc-forge'), async (board: BoardDO) => {
      const checks = [
        { name: 'status', provider: 'ci' as const, contexts: ['ci / test (pull_request)'] },
        { name: 'actions', provider: 'ci' as const, contexts: ['ci.yml'] },
      ];
      const { cardId } = await arrive(board, 'forge', reviewStages({ checks }), { provider: 'forge', headSha: SHA_A });
      await status(board, 'forge', SHA_A, 'ci / test (pull_request)', 'success');
      await deliver(board, 'forge', 'action_run_success', { action: 'success', run: { workflow_id: 'ci.yml', commit_sha: SHA_A, status: 'success', html_url: 'https://forge/run/1', repository } });
      expect(await board.pendingGateDeliveries()).toHaveLength(1);
      expect((await checksOf(board, cardId)).checks.map((c) => c.status)).toEqual(['passed', 'passed']);
    });
  });

  it('a Forgejo action_run_failure returns the card', async () => {
    await runInDurableObject(boardStub('mc-forge-fail'), async (board: BoardDO) => {
      const { cardId } = await arrive(board, 'ff', reviewStages({ checks: [{ name: 'actions', provider: 'ci', contexts: ['ci.yml'] }] }), { provider: 'forge', headSha: SHA_A });
      // A result on the GitHub door is a mirror's, never this forge pull request's.
      await status(board, 'github', SHA_A, 'ci.yml', 'failure');
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'review' });
      await deliver(board, 'forge', 'action_run_failure', { action: 'failure', run: { workflow_id: 'ci.yml', commit_sha: SHA_A, status: 'failure', html_url: 'https://forge/run/2', repository } });
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'build' });
      expect((await checksOf(board, cardId)).status).toBe('returned');
    });
  });

  it('records the head commit, ignores another commit, and starts again on a new push', async () => {
    await runInDurableObject(boardStub('mc-head'), async (board: BoardDO, state) => {
      const checks = [
        { name: 'build', provider: 'ci' as const, contexts: ['build'] },
        { name: 'lint', provider: 'ci' as const, contexts: ['lint'] },
      ];
      const { cardId } = await arrive(board, 'head', reviewStages({ checks }), { headSha: SHA_A });
      const meta = state.storage.sql.exec(`SELECT metadata_json FROM card_references`).one().metadata_json;
      expect(JSON.parse(typeof meta === 'string' ? meta : '{}')).toMatchObject({ headSha: SHA_A });
      await status(board, 'github', SHA_A, 'build', 'success');
      expect((await checksOf(board, cardId)).checks.map((c) => c.status)).toEqual(['passed', 'pending']);
      await pullRequest(board, 'github', 'synchronize', SHA_B);
      const reset = await checksOf(board, cardId);
      expect(reset.checks.map((c) => c.status)).toEqual(['pending', 'pending']);
      // A late result for the old head counts for nothing.
      await status(board, 'github', SHA_A, 'lint', 'success');
      expect((await checksOf(board, cardId)).checks.map((c) => c.status)).toEqual(['pending', 'pending']);
      await status(board, 'github', SHA_B, 'build', 'success');
      await status(board, 'github', SHA_B, 'lint', 'success');
      expect(await board.pendingGateDeliveries()).toHaveLength(1);
      expect((await checksOf(board, cardId)).checks.map((c) => c.headSha)).toEqual([SHA_B, SHA_B]);
    });
  });

  it('with no contexts named, every reported context must succeed', async () => {
    await runInDurableObject(boardStub('mc-all'), async (board: BoardDO) => {
      const { cardId } = await arrive(board, 'all', checksGateStages({ checks: [{ name: 'ci', provider: 'ci' }] }), { headSha: SHA_A });
      await status(board, 'github', SHA_A, 'lint', 'pending');
      await status(board, 'github', SHA_A, 'build', 'success');
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'verify' });
      await status(board, 'github', SHA_A, 'lint', 'error');
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'build' });
    });
  });

  it('an unsigned or wrongly signed result changes nothing', async () => {
    await runInDurableObject(boardStub('mc-hmac'), async (board: BoardDO) => {
      const { cardId } = await arrive(board, 'hmac', checksGateStages(), { headSha: SHA_A });
      const body = { sha: SHA_A, context: 'build', state: 'success', repository };
      expect(await deliver(board, 'github', 'status', body, `sha256=${'0'.repeat(64)}`)).toMatchObject({ ok: false, code: 'INVALID_SIGNATURE' });
      expect(await deliver(board, 'forge', 'status', body, '0'.repeat(64))).toMatchObject({ ok: false, code: 'INVALID_SIGNATURE' });
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'verify' });
      expect((await checksOf(board, cardId)).checks[0]?.status).toBe('pending');
    });
  });
});

// ---------------------------------------------------------------------------------------------

interface FakeVerdict {
  id: string;
  kind: string;
  judge_kind: string;
  standard?: string;
  value: unknown;
  supersedes?: string | null;
  superseded_by?: string | null;
  created_at: string;
}

/** A fake hub and SuperWitness verdict read; records the subjects asked about. */
function fakeVerdicts(verdicts: FakeVerdict[] | (() => FakeVerdict[])) {
  const asked: string[] = [];
  const fetcher: ReporterFetch = async (url) => {
    if (url === `${HUB_URL}/api/auth/service-token`) return Response.json({ token: 'tok', expiresIn: 300 });
    const u = new URL(url);
    if (`${u.origin}${u.pathname}` === `${SW_URL}/v1/verdicts`) {
      asked.push(`${u.searchParams.get('subject_kind') ?? ''} ${u.searchParams.get('subject_ref') ?? ''}`);
      return Response.json({ verdicts: typeof verdicts === 'function' ? verdicts() : verdicts });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };
  return { fetcher, asked };
}

const verdict = (over: Partial<FakeVerdict>): FakeVerdict => ({ id: newId('vrd'), kind: 'eval', judge_kind: 'grader', standard: 'quality', value: 0.9, created_at: '2026-11-09T10:00:00Z', ...over });

describe('verdict checks in the sweep', () => {
  it('atLeast: reads the run that produced the work, and passes at the bar', async () => {
    await withReporting(async () => {
      await runInDurableObject(boardStub('mc-verdict-at-least'), async (board: BoardDO) => {
        const { cardId, runId } = await arrive(board, 'vat', checksGateStages({ checks: [{ name: 'eval', provider: 'verdict', kind: 'eval', standard: 'quality', atLeast: 0.8 }] }));
        const none = fakeVerdicts([]);
        expect(await board.sweepBoard(plus(1), { verdictFetch: none.fetcher })).toMatchObject({ checksDecided: 0 });
        expect(none.asked).toEqual([`run superpipeline:brd_vat/${runId}`]);
        const fake = fakeVerdicts([verdict({ value: 0.8 })]);
        expect(await board.sweepBoard(plus(2), { verdictFetch: fake.fetcher })).toMatchObject({ checksDecided: 1 });
        expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'ship' });
      });
    });
  });

  it('atLeast: under the bar fails and returns the card', async () => {
    await withReporting(async () => {
      await runInDurableObject(boardStub('mc-verdict-under'), async (board: BoardDO) => {
        const { cardId } = await arrive(board, 'vun', checksGateStages({ checks: [{ name: 'eval', provider: 'verdict', kind: 'eval', atLeast: 0.8 }] }));
        await board.sweepBoard(plus(1), { verdictFetch: fakeVerdicts([verdict({ value: 0.5 })]).fetcher });
        expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'build' });
        expect(await pushed(board, 'check.failed')).toMatchObject([{ check: { name: 'eval', provider: 'verdict', status: 'failed' }, returnedTo: 'build' }]);
      });
    });
  });

  it('pass: true, the latest non-superseded verdict wins, and judgeKinds limits whose count', async () => {
    await withReporting(async () => {
      await runInDurableObject(boardStub('mc-verdict-pass'), async (board: BoardDO) => {
        const claim = { name: 'claim', provider: 'verdict' as const, kind: 'claim-check', pass: true as const, judgeKinds: ['agent' as const, 'rule' as const] };
        const { cardId } = await arrive(board, 'vpass', checksGateStages({ checks: [claim] }));
        const failedThenCorrected = [
          verdict({ id: 'v1', kind: 'claim-check', judge_kind: 'agent', value: 'fail', created_at: '2026-11-09T10:00:00Z', superseded_by: 'v2' }),
          verdict({ id: 'v2', kind: 'claim-check', judge_kind: 'agent', value: 'pass', created_at: '2026-11-09T09:00:00Z', supersedes: 'v1' }),
          // A later failing verdict by a judge the check does not count.
          verdict({ id: 'v3', kind: 'claim-check', judge_kind: 'human', value: false, created_at: '2026-11-09T11:00:00Z' }),
          // Another kind does not count either.
          verdict({ id: 'v4', kind: 'eval', judge_kind: 'agent', value: false, created_at: '2026-11-09T12:00:00Z' }),
        ];
        expect(await board.sweepBoard(plus(1), { verdictFetch: fakeVerdicts(failedThenCorrected).fetcher })).toMatchObject({ checksDecided: 1 });
        expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'ship' });
      });
    });
  });

  it('a superseded passing verdict does not pass the check', async () => {
    await withReporting(async () => {
      await runInDurableObject(boardStub('mc-verdict-superseded'), async (board: BoardDO) => {
        const { cardId } = await arrive(board, 'vsup', checksGateStages({ checks: [{ name: 'claim', provider: 'verdict', kind: 'claim-check', pass: true }] }));
        const list = [
          verdict({ id: 'p1', kind: 'claim-check', value: 'pass', created_at: '2026-11-09T12:00:00Z' }),
          verdict({ id: 'p2', kind: 'claim-check', value: 'fail', created_at: '2026-11-09T10:00:00Z', supersedes: 'p1' }),
        ];
        await board.sweepBoard(plus(1), { verdictFetch: fakeVerdicts(list).fetcher });
        expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'build' });
      });
    });
  });

  it('SuperWitness off: the check waits', async () => {
    await runInDurableObject(boardStub('mc-verdict-off'), async (board: BoardDO) => {
      const { cardId } = await arrive(board, 'voff', checksGateStages({ checks: [{ name: 'eval', provider: 'verdict', kind: 'eval', atLeast: 1 }] }));
      await withReporting(async () => {
        await board.sweepBoard(plus(1), { verdictFetch: fakeVerdicts([verdict({ value: 5 })]).fetcher });
      }, {});
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'verify' });
    });
  });
});

describe('overdue checks are timed like a person', () => {
  it('reminds, then escalates, while checks are pending', async () => {
    await runInDurableObject(boardStub('mc-timeout'), async (board: BoardDO, state) => {
      const { cardId } = await arrive(board, 'timeout', checksGateStages({ timeout: { remindAfterMinutes: 10, escalateAfterMinutes: 20 } }));
      const wait = state.storage.sql.exec(`SELECT kind, decision_id FROM decision_waits`).one();
      expect(wait.kind).toBe('checks');
      expect(await board.sweepBoard(plus(15))).toMatchObject({ decisionsReminded: 1 });
      expect(await board.sweepBoard(plus(25))).toMatchObject({ decisionsEscalated: 1 });
      expect(await pushed(board, 'decision.reminded')).toMatchObject([{ cardId, decisionKind: 'checks', decisionId: wait.decision_id }]);
      expect(await pushed(board, 'decision.escalated')).toMatchObject([{ cardId, decisionKind: 'checks' }]);
    });
  });

  it('a check set that passed is not reminded about', async () => {
    await runInDurableObject(boardStub('mc-timeout-passed'), async (board: BoardDO) => {
      await arrive(board, 'tpass', checksGateStages({ timeout: { remindAfterMinutes: 10 } }), { headSha: SHA_A });
      await status(board, 'github', SHA_A, 'build', 'success');
      expect(await board.sweepBoard(plus(15))).toMatchObject({ decisionsReminded: 0 });
    });
  });
});

describe('override', () => {
  const ADMIN = { by: 'usr_admin', role: 'admin' as const, comment: 'CI is down; checked by hand' };

  it('an admin passes a pending check: recorded, pushed, and the gate opens carrying it', async () => {
    await runInDurableObject(boardStub('mc-override'), async (board: BoardDO) => {
      const { cardId } = await arrive(board, 'ov', reviewStages());
      const r = await board.overrideCheck({ cardId, name: 'build', ...ADMIN });
      expect(r).toMatchObject({ ok: true, value: { checks: { status: 'passed', checks: [{ name: 'build', status: 'overridden', overridden: { by: 'usr_admin', comment: ADMIN.comment } }] } } });
      expect(await pushed(board, 'check.overridden')).toMatchObject([
        { event: 'check.overridden', boardId: 'brd_ov', cardId, cardTitle: expect.any(String), stageKey: 'review', arrivalId: expect.stringMatching(/./), check: { name: 'build', provider: 'ci', status: 'overridden' }, by: 'usr_admin', comment: ADMIN.comment, at: expect.any(String) },
      ]);
      const [gate] = await board.pendingGateDeliveries();
      expect(gate?.checks).toEqual([{ name: 'build', provider: 'ci', status: 'overridden' }]);
    });
  });

  it('refuses a member, an agent, the producer, an unknown check, a check already settled and a returned arrival', async () => {
    await runInDurableObject(boardStub('mc-override-refusals'), async (board: BoardDO) => {
      const { cardId } = await arrive(board, 'ovr', reviewStages({ checks: [CI, { name: 'lint', provider: 'ci', contexts: ['lint'] }] }), { headSha: SHA_A });
      expect(await board.overrideCheck({ cardId, name: 'build', ...ADMIN, role: 'member' })).toMatchObject({ ok: false, code: 'CHECK_OVERRIDE_NOT_ALLOWED' });
      expect(await board.overrideCheck({ cardId, name: 'build', ...ADMIN, by: 'agt_b' })).toMatchObject({ ok: false, code: 'CHECK_OVERRIDE_NOT_ALLOWED' });
      expect(await board.overrideCheck({ cardId, name: 'build', ...ADMIN, agent: true })).toMatchObject({ ok: false, code: 'CHECK_OVERRIDE_NOT_ALLOWED' });
      expect(await board.overrideCheck({ cardId, name: 'build', ...ADMIN, principalId: 'agt_b' })).toMatchObject({ ok: false, code: 'SEPARATION_OF_DUTIES' });
      expect(await board.overrideCheck({ cardId, name: 'nope', ...ADMIN })).toMatchObject({ ok: false, code: 'CHECK_NOT_FOUND' });
      expect(await board.overrideCheck({ cardId, name: 'build', ...ADMIN, comment: '  ' })).toMatchObject({ ok: false, code: 'INVALID_COMMENT' });
      await status(board, 'github', SHA_A, 'build', 'success');
      expect(await board.overrideCheck({ cardId, name: 'build', ...ADMIN })).toMatchObject({ ok: false, code: 'CHECK_NOT_OPEN' });
      await status(board, 'github', SHA_A, 'lint', 'failure');
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'build' });
      expect(await board.overrideCheck({ cardId, name: 'lint', ...ADMIN })).toMatchObject({ ok: false, code: 'CHECK_NOT_OPEN' });
    });
  });

  it('the producer of the work is refused even as an admin', async () => {
    await runInDurableObject(boardStub('mc-override-producer'), async (board: BoardDO) => {
      // An approval passes the work on with the approver as its producer.
      const stages: Stage[] = [
        { key: 'write', name: 'Write', order: 0, ownerKind: 'capability', owner: 'write' },
        { key: 'approve', name: 'Approve', order: 1, ownerKind: 'human', gate: 'approval' },
        { key: 'verify', name: 'Verify', order: 2, ownerKind: 'human', gate: 'checks', returnStage: 'write', checks: [CI] },
        { key: 'ship', name: 'Ship', order: 3, ownerKind: 'capability', owner: 'ship' },
      ];
      await board.init({ id: 'brd_prod', tenantId: 'tnt_mc', name: 'C', stages });
      const made = await board.createCard({ title: 'x', ownerUserId: 'usr_owner' });
      if (!made.ok) throw new Error(made.message);
      const c = await board.claim({ agentId: 'agt_w', capabilities: ['write'] });
      if (!c.claimed) throw new Error('no claim');
      await board.complete({ runId: c.runId, leaseEpoch: c.leaseEpoch, handoff: { summary: 'w' } });
      const gateId = (await board.getState()).gates[0]?.id ?? '';
      expect((await board.resolveGate({ gateId, decision: 'approve', decidedBy: 'usr_admin' })).ok).toBe(true);
      expect(await cardOf(board, made.value.id)).toMatchObject({ currentStageKey: 'verify' });
      expect(await board.overrideCheck({ cardId: made.value.id, name: 'build', ...ADMIN })).toMatchObject({ ok: false, code: 'SEPARATION_OF_DUTIES' });
      expect((await board.overrideCheck({ cardId: made.value.id, name: 'build', ...ADMIN, by: 'usr_other' })).ok).toBe(true);
      expect(await cardOf(board, made.value.id)).toMatchObject({ currentStageKey: 'ship' });
    });
  });

  it('a failed check the card could not return from stays open to an override', async () => {
    await runInDurableObject(boardStub('mc-override-parked'), async (board: BoardDO, state) => {
      const { cardId } = await arrive(board, 'park', checksGateStages(), { headSha: SHA_A });
      // Two automatic returns already spent: the next failure parks the card instead.
      state.storage.sql.exec(`UPDATE cards SET auto_returns = 2 WHERE id = ?`, cardId);
      await status(board, 'github', SHA_A, 'build', 'failure');
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'verify', state: 'input-required', needsHuman: { reason: 'repeated-failure' } });
      expect(await pushed(board, 'check.failed')).toMatchObject([{ returnedTo: null }]);
      expect((await board.overrideCheck({ cardId, name: 'build', ...ADMIN })).ok).toBe(true);
      expect(await cardOf(board, cardId)).toMatchObject({ currentStageKey: 'ship' });
    });
  });
});

describe('decision_waits made before checks', () => {
  it('is rebuilt once with its rows, and takes a checks wait', async () => {
    await runInDurableObject(boardStub('mc-migrate'), async (_board: BoardDO, state) => {
      const sql = state.storage.sql;
      sql.exec(`DROP TABLE decision_waits`);
      sql.exec(
        `CREATE TABLE decision_waits (kind TEXT NOT NULL CHECK (kind IN ('gate', 'question', 'delivery', 'attention')), decision_id TEXT NOT NULL, card_id TEXT NOT NULL, stage_key TEXT NOT NULL, waiting_since TEXT NOT NULL, remind_at TEXT, escalate_at TEXT, reminded_at TEXT, escalated_at TEXT, remind_skipped INTEGER NOT NULL DEFAULT 0, next_due_at TEXT, closed_at TEXT, PRIMARY KEY (kind, decision_id))`,
      );
      sql.exec(`INSERT INTO decision_waits (kind, decision_id, card_id, stage_key, waiting_since, next_due_at) VALUES ('gate', 'gate_1', 'card_1', 's', 't', 'n')`);
      expect(() => sql.exec(`INSERT INTO decision_waits (kind, decision_id, card_id, stage_key, waiting_since) VALUES ('checks', 'x', 'c', 's', 't')`)).toThrow(/CHECK constraint failed/);
      createDecisionTables(sql);
      createDecisionTables(sql);
      expect(sql.exec(`SELECT kind, decision_id, next_due_at FROM decision_waits`).toArray()).toEqual([{ kind: 'gate', decision_id: 'gate_1', next_due_at: 'n' }]);
      sql.exec(`INSERT INTO decision_waits (kind, decision_id, card_id, stage_key, waiting_since) VALUES ('checks', 'x', 'c', 's', 't')`);
      expect(sql.exec(`SELECT name FROM sqlite_master WHERE name = 'idx_decision_waits_due'`).toArray()).toHaveLength(1);
    });
  });
});

describe('over HTTP', () => {
  const TENANT = 'tnt_machine_checks';
  beforeEach(() => __resetJwksCacheForTests());
  beforeAll(async () => {
    await env.DB.prepare(`INSERT OR IGNORE INTO tenants (id, slug, name) VALUES (?, ?, 'Checks')`).bind(TENANT, 'slug-machine-checks').run();
    for (const [user, role] of [['usr_mc_admin', 'admin'], ['usr_mc_member', 'member']] as const) {
      await env.DB.prepare(`INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)`).bind(user, `${user}@example.test`, user).run();
      await env.DB.prepare(`INSERT OR IGNORE INTO memberships (id, tenant_id, user_id, role) VALUES (?, ?, ?, ?)`).bind(newId('mem'), TENANT, user, role).run();
    }
  });
  const call = (method: string, path: string, who: { user?: string; agent?: string }, body?: unknown) =>
    SELF.fetch(`https://api.test${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'X-Tenant-Id': TENANT,
        ...(who.user ? { 'X-User-Id': who.user } : {}),
        ...(who.agent ? { 'X-Agent-Id': who.agent, Authorization: 'Bearer dev' } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

  it('creating a board with checks is an admin act, and bad checks are a 400', async () => {
    const stages = reviewStages();
    const ORG = 'org_0000000000000000e4e1';
    await withOrgPlane(async () => {
      await ensureOrgTenant(env.DB, ORG);
      // The fresh tenant's first visitor: a local owner (so `manage` admits them) whom Accounts calls a member.
      const token = await planeToken({ sub: 'prn_0000000000000000e4e1', email: 'first-checks@example.com', org: ORG, orgRole: 'member' });
      for (const body of [{ name: 'C', stages }, { name: 'C', stages: checksGateStages() }]) {
        const create = await SELF.fetch('https://api.test/v1/boards', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        expect(create.status).toBe(403);
        expect(await create.json()).toMatchObject({ error: { code: 'WORKSPACE_ADMIN_REQUIRED' } });
      }
    });
    expect((await call('POST', '/v1/boards', { user: 'usr_mc_admin' }, { name: 'C', stages })).status).toBe(201);
    const bad = await call('POST', '/v1/boards', { user: 'usr_mc_admin' }, { name: 'C', stages: reviewStages({ returnStage: undefined }) });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: { code: 'INVALID_STAGES' } });
  });

  it('reads checks, refuses a member and an agent by name, and lets an admin override', async () => {
    const boardId = newId('brd');
    const stages = reviewStages();
    const board = stubFor(env, TENANT, boardId);
    await board.init({ id: boardId, tenantId: TENANT, name: 'C', stages });
    await recordBoard(env.DB, TENANT, { id: boardId, name: 'C', stagesJson: JSON.stringify(stages) });
    const made = await board.createCard({ title: 'x', ownerUserId: 'usr_mc_admin' });
    if (!made.ok) throw new Error(made.message);
    const c = await board.claim({ agentId: 'agt_b', capabilities: ['build'] });
    if (!c.claimed) throw new Error('no claim');
    await board.complete({ runId: c.runId, leaseEpoch: c.leaseEpoch, handoff: { summary: 'd' } });
    const base = `/v1/boards/${boardId}/cards/${made.value.id}/checks`;

    const read = await call('GET', base, { user: 'usr_mc_member' });
    expect(read.status).toBe(200);
    expect(await read.json()).toMatchObject({ checks: { stageKey: 'review', status: 'open', checks: [{ name: 'build', provider: 'ci', status: 'pending' }] } });
    expect((await call('GET', base, { agent: 'agt_b' })).status).toBe(200);
    expect((await call('GET', `/v1/boards/${boardId}/cards/card_nope/checks`, { user: 'usr_mc_member' })).status).toBe(404);

    const member = await call('POST', `${base}/build/override`, { user: 'usr_mc_member' }, { comment: 'please' });
    expect(member.status).toBe(403);
    expect(await member.json()).toMatchObject({ error: { code: 'CHECK_OVERRIDE_NOT_ALLOWED' } });
    const agent = await call('POST', `${base}/build/override`, { agent: 'agt_x' }, { comment: 'please' });
    expect(agent.status).toBe(403);
    expect(await agent.json()).toMatchObject({ error: { code: 'CHECK_OVERRIDE_NOT_ALLOWED' } });
    expect((await call('POST', `${base}/build/override`, { user: 'usr_mc_admin' }, {})).status).toBe(400);
    const unknown = await call('POST', `${base}/nope/override`, { user: 'usr_mc_admin' }, { comment: 'x' });
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toMatchObject({ error: { code: 'CHECK_NOT_FOUND' } });

    const ok = await call('POST', `${base}/build/override`, { user: 'usr_mc_admin' }, { comment: 'CI is down' });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ checks: { status: 'passed', checks: [{ name: 'build', status: 'overridden' }] }, card: { currentStageKey: 'review' } });
    const again = await call('POST', `${base}/build/override`, { user: 'usr_mc_admin' }, { comment: 'again' });
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ error: { code: 'CHECK_NOT_OPEN' } });
    const gates = await call('GET', `/v1/boards/${boardId}/gates/pending`, { user: 'usr_mc_member' });
    expect(await gates.json()).toMatchObject({ gates: [{ checks: [{ name: 'build', status: 'overridden' }] }] });
  });
});
