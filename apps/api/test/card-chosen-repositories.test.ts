/**
 * Bench stages choose repositories per card: treaty v0.0.16's ten producer-state scenarios
 * (fixtures/superpipeline-run-checkpoint/selection.json `producer`), asserted on board state.
 * The routes and settlement have their own files (card-repositories-routes, checkpoint-card-selection).
 */
import { initPrivateCheckpointBoard } from './helpers/checkpoint-policy';
import { env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { BoardDO, type StageDef } from '../src/board/board-do';
import type { BoardContext } from '../src/board/context';
import type { VerifiedCheckpointReporter } from '../src/auth/checkpoint-reporter';
import { readCheckpointClaim } from '../src/board/checkpoint-claims';
import { canonicalCheckpoint, checkpointDigest } from '../src/board/checkpoint-json';
import { parseCheckpointPolicy } from '../src/board/checkpoint-proposal';
import { parseCardCheckpointPolicy, type CardCheckpointPolicy } from '../src/board/checkpoint-selection';
import { admitCheckpointSourceCandidate, createCheckpointSourceTables, type CheckpointSource } from '../src/board/checkpoint-source';
import { internalStageEditor } from '../src/board/model';
import vectors from './fixtures/checkpoint-settlement/selection.json';

const V1 = 'superpipeline.checkpoint-claim.v1';
const V2 = 'superpipeline.checkpoint-claim.v2';
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const chooses = parseCardCheckpointPolicy(encode(vectors.stages.chooses));
const choosesWithDefault = parseCardCheckpointPolicy(encode(vectors.stages.choosesWithDefault));
const fixed = parseCheckpointPolicy(encode(vectors.stages.fixed));
const admin = internalStageEditor('card-chosen repositories fixture');
const v2 = { agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: V1, checkpointProtocols: [V1, V2] };
/** The scenarios below, by treaty's names; the first test holds this list to treaty's. */
const COVERED = ['refused-on-entry', 'no-choice-enters-and-waits', 'allowlist-shrinks-after-entry', 'frozen-once-a-bench-exists',
  'claim-freezes-the-selection', 'old-claimant-never-offered', 'fixed-stage-unchanged', 'one-policy-per-stage',
  'card-writers-choose', 'default-change-spares-existing-claims'];
it('covers every producer scenario treaty states', () => {
  expect(vectors.producer.map((p) => p.name).toSorted()).toEqual(COVERED.toSorted());
});

const plan: StageDef = { key: 'plan', name: 'Plan', order: 0, ownerKind: 'human' };
const build = (policy: CardCheckpointPolicy = chooses): StageDef => ({ key: 'build', name: 'Build', order: 1, ownerKind: 'capability', owner: 'code', cardCheckpointPolicy: policy });
const ship: StageDef = { key: 'ship', name: 'Ship', order: 2, ownerKind: 'human' };
let serial = 0;

interface Fixture { board: BoardDO; state: DurableObjectState; context: BoardContext; id: string }
async function fixture(stages: StageDef[], check: (f: Fixture) => Promise<void>) {
  const id = `brd_cardrepos${serial++}`;
  await runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(id)), async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    await initPrivateCheckpointBoard(board, { id, tenantId: 'tnt_cardrepos', name: 'Repositories', stages });
    const context: BoardContext = Reflect.get(board, 'board');
    try { await check({ board, state, context, id }); } finally { await state.storage.deleteAlarm(); }
  });
}
/** Run `fn` with the board's checkpoint policy switch on, as a workspace admin's write needs. */
async function asAdmin<T>(context: BoardContext, fn: () => Promise<T>): Promise<T> {
  context.env.PROPOSED_CHECKPOINT_POLICY = 'true';
  try { return await fn(); } finally { delete context.env.PROPOSED_CHECKPOINT_POLICY; }
}
const cardRow = (state: DurableObjectState, id: string) => state.storage.sql.exec('SELECT * FROM cards WHERE id=?', id).one();
async function card(board: BoardDO, input: Parameters<BoardDO['createCard']>[0]) {
  const made = await board.createCard(input);
  if (!made.ok) throw new Error(made.message);
  return made.value;
}

describe('refused-on-entry', () => {
  it('a create into the stage naming a repository outside the allowlist stores nothing', () => fixture([plan, build(), ship], async ({ board, state }) => {
    expect(await board.createCard({ title: 'Outside', ownerUserId: 'usr_a', stageKey: 'build', repositories: { repositories: ['app', 'mobile'] } }))
      .toMatchObject({ ok: false, code: 'REPOSITORY_CHOICE_REFUSED', detail: { reason: 'repository-not-allowed', stageKey: 'build' }, message: expect.stringContaining('mobile') });
    expect(state.storage.sql.exec('SELECT COUNT(*) AS n FROM cards').one().n).toBe(0);
  }));
  it('a move into the stage with two repositories and no start moves nothing', () => fixture([plan, build(), ship], async ({ board, state }) => {
    // The planning stage has no allowlist, so the choice is accepted there and checked on entry.
    const made = await card(board, { title: 'Two', ownerUserId: 'usr_a', repositories: { repositories: ['api', 'docs'] } });
    const before = cardRow(state, made.id);
    expect(await board.moveCard(made.id, 'build', 'usr_a')).toMatchObject({ ok: false, code: 'REPOSITORY_CHOICE_REFUSED', detail: { reason: 'no-primary' } });
    expect(cardRow(state, made.id)).toEqual(before);
  }));
  it('an edit in the stage naming a start repository it did not choose writes nothing', () => fixture([build(), ship], async ({ board, state }) => {
    const made = await card(board, { title: 'Edit', ownerUserId: 'usr_a' });
    const before = cardRow(state, made.id);
    expect(await board.updateCard(made.id, { repositories: { repositories: ['api'], primaryRepository: 'app' } }))
      .toMatchObject({ ok: false, code: 'REPOSITORY_CHOICE_REFUSED', detail: { reason: 'primary-not-chosen' } });
    expect(cardRow(state, made.id)).toEqual(before);
    // The same card may choose within the allowlist, and reads it back on its view.
    expect(await board.updateCard(made.id, { repositories: { repositories: ['api', 'docs'], primaryRepository: 'docs' } }))
      .toMatchObject({ ok: true, value: { repositories: ['api', 'docs'], primaryRepository: 'docs' } });
    expect(cardRow(state, made.id).repositories_json).toBe('{"primaryRepository":"docs","repositories":["api","docs"]}');
  }));
  it('a resume into the stage is an entry too', () => fixture([build(), ship], async ({ board, state }) => {
    const made = await card(board, { title: 'Resume', ownerUserId: 'usr_a' });
    state.storage.sql.exec(`UPDATE cards SET repositories_json=?, state='input-required' WHERE id=?`, '{"repositories":["api","docs"]}', made.id);
    expect(await board.resumeCard({ cardId: made.id, comment: 'try again', actor: { id: 'usr_a', name: null } }))
      .toMatchObject({ ok: false, code: 'REPOSITORY_CHOICE_REFUSED', detail: { reason: 'no-primary' } });
  }));
});

describe('no-choice-enters-and-waits', () => {
  it('enters, is parked for a person at claim with the reason, and claims once a person chooses', () => fixture([build(), ship], async ({ board, state }) => {
    const made = await card(board, { title: 'None', ownerUserId: 'usr_a' });
    expect(made).not.toHaveProperty('repositories');
    expect(await board.claim(v2)).toMatchObject({ claimed: false });
    const parked = await board.getCardView(made.id);
    expect(parked).toMatchObject({ ok: true, value: { state: 'input-required', needsHuman: { reason: 'blocked', detail: expect.stringContaining('choose the repositories') } } });
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toEqual([]);
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_claims').toArray()).toEqual([]);
    // A person chooses and sends it back; the next claim narrows to that choice.
    expect(await board.updateCard(made.id, { repositories: { repositories: ['api'] } })).toMatchObject({ ok: true });
    expect(await board.resumeCard({ cardId: made.id, comment: 'api only', actor: { id: 'usr_a', name: null } })).toMatchObject({ ok: true });
    expect(await board.claim(v2)).toMatchObject({ claimed: true, checkpointClaim: { selection: { source: 'card', repositories: ['api'], checkpointRepository: 'api' } } });
  }));
});

describe('allowlist-shrinks-after-entry', () => {
  it('parks the card naming the repository the stage no longer allows, and claims nothing', () => fixture([build(), ship], async ({ board, state, context }) => {
    const made = await card(board, { title: 'Docs', ownerUserId: 'usr_a', repositories: { repositories: ['api', 'docs'], primaryRepository: 'docs' } });
    const shrunk = { ...chooses, repositories: chooses.repositories.filter((r) => r.name !== 'docs') };
    expect(await asAdmin(context, () => board.updateStage('build', { cardCheckpointPolicy: shrunk }, admin))).toMatchObject({ ok: true });
    expect(await board.claim(v2)).toMatchObject({ claimed: false });
    expect(await board.getCardView(made.id)).toMatchObject({ ok: true, value: {
      state: 'input-required', repositories: ['api', 'docs'], needsHuman: { reason: 'blocked', detail: expect.stringContaining('docs') },
    } });
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toEqual([]);
  }));
});

describe('frozen-once-a-bench-exists', () => {
  it('refuses a changed choice once claimed, even after the run ends, and accepts the same one', () => fixture([build(), ship], async ({ board }) => {
    const made = await card(board, { title: 'Frozen', ownerUserId: 'usr_a', repositories: { repositories: ['api', 'app'] } });
    const claim = await board.claim(v2);
    if (!claim.claimed) throw new Error('expected a claim');
    for (const repositories of [{ repositories: ['app'] }, { repositories: ['api', 'app'], primaryRepository: 'api' }, null]) {
      expect(await board.updateCard(made.id, { repositories })).toMatchObject({ ok: false, code: 'REPOSITORY_CHOICE_REFUSED', detail: { reason: 'frozen' } });
    }
    expect(await board.updateCard(made.id, { repositories: { repositories: ['api', 'app'] } })).toMatchObject({ ok: true });
    expect(await board.release({ runId: claim.runId, leaseEpoch: claim.leaseEpoch, agentId: 'agt_example' })).toMatchObject({ ok: true });
    expect(await board.updateCard(made.id, { repositories: { repositories: ['app'] } })).toMatchObject({ ok: false, detail: { reason: 'frozen' } });
  }));
  it('a card claimed only on a v1 stage is not frozen', () => fixture([{ ...build(), cardCheckpointPolicy: undefined, checkpointPolicy: fixed }, ship], async ({ board }) => {
    const made = await card(board, { title: 'Fixed', ownerUserId: 'usr_a', repositories: { repositories: ['api'] } });
    expect(await board.claim(v2)).toMatchObject({ claimed: true });
    expect(await board.updateCard(made.id, { repositories: { repositories: ['app'] } })).toMatchObject({ ok: true });
  }));
});

async function claimed(f: Fixture) {
  const made = await card(f.board, { title: 'Bench', ownerUserId: 'usr_a', repositories: { repositories: ['api', 'app'] } });
  const claim = await f.board.claim(v2);
  if (!claim.claimed || !claim.checkpointClaim) throw new Error('expected a checkpoint claim');
  const source: CheckpointSource = {
    binding: { boardId: f.id, cardId: made.id, stageKey: 'build', runId: claim.runId, leaseEpoch: claim.leaseEpoch,
      agentId: 'agt_example', stationId: 'station_pilot01', nodeId: 'node_pilot01', attemptId: 'attempt-1' },
    start: [{ name: 'api', commit: '9'.repeat(40) }, { name: 'app', commit: 'b'.repeat(40) }],
    benchKey: made.id, benchId: 'c'.repeat(32), requestId: 'run-checkpoint-1',
    sourceRequestSha256: '0'.repeat(64), workerContextSha256: '4'.repeat(64),
  };
  const actor: VerifiedCheckpointReporter = { kind: 'service', tenantId: 'tnt_cardrepos', principalId: chooses.reporterPrincipalId, scopes: ['checkpoints:submit'], expiresAt: Date.now() + 60000 };
  createCheckpointSourceTables(f.state.storage.sql);
  return { made, claim, source, actor };
}
const bytes = (source: CheckpointSource) => new TextEncoder().encode(JSON.stringify(source));
const privateOnly = { privateTestOnly: true } as const;

describe('claim-freezes-the-selection', () => {

  it('stores the stage policy digest, the selection and the narrowed policy with the claim', () => fixture([build(), ship], async (f) => {
    const { claim } = await claimed(f);
    const row = f.state.storage.sql.exec('SELECT * FROM proposed_checkpoint_selections WHERE run_id=?', claim.runId).one();
    expect(row.stage_policy_json).toBe(canonicalCheckpoint(chooses));
    if (typeof row.selection_json !== 'string') throw new Error('expected a stored selection');
    expect(JSON.parse(row.selection_json)).toEqual({
      version: 'superpipeline.checkpoint-selection.v1', stagePolicyDigest: await checkpointDigest(chooses),
      source: 'card', repositories: ['api', 'app'], checkpointRepository: 'app',
    });
    expect(readCheckpointClaim(f.state.storage.sql, claim.runId)?.policy.repositories.map((r) => r.name)).toEqual(['api', 'app']);
    expect(() => f.state.storage.sql.exec("UPDATE proposed_checkpoint_selections SET selection_json='{}'")).toThrow('immutable checkpoint selection');
    expect(() => f.state.storage.sql.exec('DELETE FROM proposed_checkpoint_selections')).toThrow('immutable checkpoint selection');
  }));
  it('admits a source vector over the narrowed repositories, never over the whole allowlist', () => fixture([build(), ship], async (f) => {
    const { source, actor } = await claimed(f);
    const whole = { ...source, start: [...source.start, { name: 'docs', commit: 'd'.repeat(40) }] };
    await expect(admitCheckpointSourceCandidate(f.context, () => actor, bytes(whole), privateOnly)).rejects.toThrow('INVALID_CHECKPOINT_SOURCE');
    expect(await admitCheckpointSourceCandidate(f.context, () => actor, bytes(source), privateOnly)).toMatchObject({ runId: source.binding.runId });
  }));
  it('a stage policy change before settlement makes the claim stale', () => fixture([build(), ship], async (f) => {
    const { source, actor } = await claimed(f);
    // Written past the policy gate (which refuses while work is active), as a concurrent admin
    // edit would land: a default that leaves this card's narrowing exactly as it was.
    f.state.storage.sql.exec("UPDATE meta SET v=? WHERE k='stages'", JSON.stringify([build({ ...chooses, defaultRepositories: ['app'] }), ship]));
    await expect(admitCheckpointSourceCandidate(f.context, () => actor, bytes(source), privateOnly)).rejects.toThrow('INVALID_CHECKPOINT_SOURCE');
  }));
});

describe('old-claimant-never-offered', () => {
  it.each([
    ['a v1 claimant', { checkpointProtocol: V1 }],
    ['a v1 claimant asking for checkpoint work only', { checkpointProtocol: V1, checkpointOnly: true }],
    ['a list without checkpointProtocol', { checkpointProtocols: [V1, V2] }],
    ['a legacy claimant', {}],
  ])('%s', (_name, protocols) => fixture([build(), ship], async ({ board, state }) => {
    await card(board, { title: 'Offered', ownerUserId: 'usr_a', repositories: { repositories: ['api'] } });
    expect(await board.claim({ agentId: 'agt_example', capabilities: ['code'], ...protocols })).toMatchObject({ claimed: false, reason: 'capability_mismatch' });
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toEqual([]);
  }));
});

describe('fixed-stage-unchanged', () => {
  it('a v1 stage ignores the card\'s choice for every claimant and records no selection', () => fixture([{ key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'code', checkpointPolicy: fixed }, ship], async ({ board, state }) => {
    await card(board, { title: 'Fixed', ownerUserId: 'usr_a', repositories: { repositories: ['api'] } });
    const claim = await board.claim(v2);
    if (!claim.claimed || !claim.checkpointClaim) throw new Error('expected a checkpoint claim');
    expect(claim.checkpointClaim.policy).toEqual(fixed);
    expect(claim.checkpointClaim).not.toHaveProperty('selection');
    expect(state.storage.sql.exec("SELECT name FROM sqlite_master WHERE name='proposed_checkpoint_selections'").toArray()).toEqual([]);
  }));
});

describe('one-policy-per-stage', () => {
  it('refuses a stage carrying both policies, on creation and on a patch', async () => {
    const id = `brd_cardrepos${serial++}`;
    await runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(id)), async (board) => {
      if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
      await expect(initPrivateCheckpointBoard(board, { id, tenantId: 'tnt_cardrepos', name: 'Both', stages: [{ ...build(), checkpointPolicy: fixed }] }))
        .rejects.toThrow('never both');
    });
    await fixture([build(), ship], async ({ board, context }) => {
      expect(await asAdmin(context, () => board.updateStage('build', { checkpointPolicy: fixed }, admin)))
        .toMatchObject({ ok: false, code: 'INVALID_STAGES', message: expect.stringContaining('never both') });
      expect(await asAdmin(context, () => board.setStages([{ ...build(), checkpointPolicy: fixed }, ship], admin))).toMatchObject({ ok: false, code: 'INVALID_STAGES' });
    });
  });
  it('a default that resolves no start repository is refused when written', () => fixture([build(), ship], async ({ board, context }) => {
    expect(await asAdmin(context, () => board.updateStage('build', { cardCheckpointPolicy: { ...chooses, defaultRepositories: ['api', 'docs'] } }, admin)))
      .toMatchObject({ ok: false, code: 'INVALID_STAGES', message: 'cardCheckpointPolicy is invalid: default-without-start' });
  }));
});

describe('card-writers-choose', () => {
  it('only an owner or admin writes the allowlist, as for checkpointPolicy', () => fixture([build(), ship], async ({ board, context }) => {
    const member = { kind: 'person' as const, mayChangeDecisionPolicy: false };
    expect(await asAdmin(context, () => board.updateStage('build', { cardCheckpointPolicy: choosesWithDefault }, member)))
      .toMatchObject({ ok: false, code: 'WORKSPACE_ADMIN_REQUIRED' });
  }));
});

describe('default-change-spares-existing-claims', () => {
  it('a claim keeps the default it was narrowed with; later claims get the new one', () => fixture([build(choosesWithDefault), ship], async ({ board, state, context }) => {
    await card(board, { title: 'Before', ownerUserId: 'usr_a' });
    const first = await board.claim(v2);
    if (!first.claimed) throw new Error('expected a claim');
    expect(first.checkpointClaim?.selection).toMatchObject({ source: 'default', repositories: ['app'] });
    const before = state.storage.sql.exec('SELECT * FROM proposed_checkpoint_selections WHERE run_id=?', first.runId).one();
    await board.release({ runId: first.runId, leaseEpoch: first.leaseEpoch, agentId: 'agt_example' });
    expect(await asAdmin(context, () => board.updateStage('build', { cardCheckpointPolicy: { ...choosesWithDefault, defaultRepositories: ['api'] } }, admin))).toMatchObject({ ok: true });
    await card(board, { title: 'After', ownerUserId: 'usr_a', priority: 9 });
    const second = await board.claim(v2);
    expect(second).toMatchObject({ claimed: true, card: { title: 'After' }, checkpointClaim: { selection: { source: 'default', repositories: ['api'], checkpointRepository: 'api' } } });
    expect(state.storage.sql.exec('SELECT * FROM proposed_checkpoint_selections WHERE run_id=?', first.runId).one()).toEqual(before);
    expect(readCheckpointClaim(state.storage.sql, first.runId)?.selection).toMatchObject({ repositories: ['app'] });
  }));
  it('a card that named none keeps what it resolved to: its re-claim reuses it after the default changed', () => fixture([build(choosesWithDefault), ship], async ({ board, context }) => {
    const made = await card(board, { title: 'Default', ownerUserId: 'usr_a' });
    const first = await board.claim(v2);
    if (!first.claimed) throw new Error('expected a claim');
    // Fixed onto the card at the claim, like a choice it made, and frozen from then on.
    expect(first.card).toMatchObject({ repositories: ['app'] });
    expect(await board.updateCard(made.id, { repositories: null })).toMatchObject({ ok: false, detail: { reason: 'frozen' } });
    await board.release({ runId: first.runId, leaseEpoch: first.leaseEpoch, agentId: 'agt_example' });
    expect(await asAdmin(context, () => board.updateStage('build', { cardCheckpointPolicy: { ...choosesWithDefault, defaultRepositories: ['api'] } }, admin))).toMatchObject({ ok: true });
    const again = await board.claim(v2);
    expect(again).toMatchObject({ claimed: true, card: { id: made.id }, checkpointClaim: { selection: { repositories: ['app'], checkpointRepository: 'app' } } });
    expect(again.claimed && again.checkpointClaim?.policy.repositories.map((r) => r.name)).toEqual(['app']);
  }));
  it('a card claimed on the default admits its source, now that it carries the resolved repositories', () => fixture([build(choosesWithDefault), ship], async (f) => {
    const made = await card(f.board, { title: 'Default bench', ownerUserId: 'usr_a' });
    const claim = await f.board.claim(v2);
    if (!claim.claimed) throw new Error('expected a claim');
    createCheckpointSourceTables(f.state.storage.sql);
    const source: CheckpointSource = {
      binding: { boardId: f.id, cardId: made.id, stageKey: 'build', runId: claim.runId, leaseEpoch: claim.leaseEpoch,
        agentId: 'agt_example', stationId: 'station_pilot01', nodeId: 'node_pilot01', attemptId: 'attempt-1' },
      start: [{ name: 'app', commit: 'b'.repeat(40) }], benchKey: made.id, benchId: 'c'.repeat(32), requestId: 'run-checkpoint-1',
      sourceRequestSha256: '0'.repeat(64), workerContextSha256: '4'.repeat(64),
    };
    const actor: VerifiedCheckpointReporter = { kind: 'service', tenantId: 'tnt_cardrepos', principalId: chooses.reporterPrincipalId, scopes: ['checkpoints:submit'], expiresAt: Date.now() + 60000 };
    expect(await admitCheckpointSourceCandidate(f.context, () => actor, bytes(source), privateOnly)).toMatchObject({ runId: claim.runId });
  }));
});
