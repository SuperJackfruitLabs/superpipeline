/**
 * treaty v0.0.16's selection vectors (fixtures/superpipeline-run-checkpoint/selection.json), run
 * through the code that serves them: a stage policy through board initialisation, a card's choice
 * through card creation, and every narrowing through a real claim, whose frozen policy, digest and
 * selection must equal the vector's byte for byte.
 */
import { initPrivateCheckpointBoard } from './helpers/checkpoint-policy';
import { env, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { BoardDO, type StageDef } from '../src/board/board-do';
import { canonicalCheckpoint, checkpointDigest } from '../src/board/checkpoint-json';
import { stageCheckpointFieldError } from '../src/board/checkpoint-policy-admin';
import {
  isCardRepositories, isCheckpointSelection, narrowCheckpointPolicy, parseCardCheckpointPolicy,
  type CardCheckpointPolicy, type CardRepositories,
} from '../src/board/checkpoint-selection';
import { cardRepositoriesInput } from '../src/routes/fields';
import vectors from './fixtures/checkpoint-settlement/selection.json';
import canonical from './fixtures/checkpoint-settlement/canonical.json';

const V1 = 'superpipeline.checkpoint-claim.v1';
const V2 = 'superpipeline.checkpoint-claim.v2';
const stages: Record<string, unknown> = vectors.stages;
let serial = 0;

/** A board whose one stage carries the named vector stage policy, in its v1 or v2 field. */
async function onStage(name: string, check: (board: BoardDO, state: DurableObjectState) => Promise<void>) {
  const id = `brd_selectionvector${serial++}`;
  await runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(id)), async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    const policy = stages[name] as { version: string };
    const stage: StageDef = { key: 'test', name: 'Test', order: 0, ownerKind: 'capability', owner: 'code' };
    if (policy.version === 'superpipeline.checkpoint-policy.v2') stage.cardCheckpointPolicy = policy as CardCheckpointPolicy;
    else stage.checkpointPolicy = policy as StageDef['checkpointPolicy'];
    await initPrivateCheckpointBoard(board, { id, tenantId: 'tnt_selectionvector', name: 'Vectors', stages: [stage] });
    try { await check(board, state); } finally { await state.storage.deleteAlarm(); }
  });
}

describe('narrowing vectors, through a real claim', () => {
  it.each(vectors.narrowing.map((v) => [v.name, v] as const))('%s', (_name, vector) => onStage(vector.stage, async (board, state) => {
    const card: Partial<CardRepositories> = vector.card;
    const choice = card.repositories ? { repositories: card.repositories, ...(card.primaryRepository ? { primaryRepository: card.primaryRepository } : {}) } : undefined;
    const made = await board.createCard({ title: 'Vector', ownerUserId: 'usr_vector', ...(choice ? { repositories: choice } : {}) });
    if ('refuse' in vector && vector.refuse !== 'needs-person') {
      // A choice the allowlist cannot narrow to is refused on entry, in the vector's word, and
      // nothing is stored.
      expect(made).toMatchObject({ ok: false, code: 'REPOSITORY_CHOICE_REFUSED', detail: { reason: vector.refuse } });
      expect(state.storage.sql.exec('SELECT COUNT(*) AS n FROM cards').one().n).toBe(0);
      return;
    }
    if (!made.ok) throw new Error(made.message);
    const claim = await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: V1, checkpointProtocols: [V1, V2] });
    if ('refuse' in vector) {
      // needs-person: parked, visibly, and never benched with the whole allowlist.
      expect(claim).toMatchObject({ claimed: false });
      expect(state.storage.sql.exec('SELECT state, needs_human_json FROM cards').one()).toMatchObject({ state: 'input-required' });
      expect(JSON.parse(String(state.storage.sql.exec('SELECT needs_human_json FROM cards').one().needs_human_json))).toMatchObject({ reason: 'blocked' });
      expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toEqual([]);
      return;
    }
    if (!claim.claimed || !claim.checkpointClaim) throw new Error('expected a checkpoint claim');
    expect(claim.checkpointClaim.policy).toEqual(vector.expect.policy);
    expect(claim.checkpointClaim.policyDigest).toBe(vector.expect.policyDigest);
    if ('selection' in vector.expect) expect(claim.checkpointClaim.selection).toEqual(vector.expect.selection);
    else expect(claim.checkpointClaim).not.toHaveProperty('selection');
    // The claimant never sees the internal copy of the stage policy.
    expect(claim.checkpointClaim).not.toHaveProperty('stagePolicy');
  }));

  it('a v1 stage gives a v1-only claimant the same claim it gives a v2 one', () => onStage('fixed', async (board) => {
    await board.createCard({ title: 'Fixed', ownerUserId: 'usr_vector', repositories: { repositories: ['api'] } });
    const claim = await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: V1 });
    const fixed = vectors.narrowing.find((v) => v.name === 'fixed-stage-ignores-the-card');
    if (!claim.claimed || !fixed?.expect) throw new Error('expected a claim');
    expect(claim.checkpointClaim?.policyDigest).toBe(fixed.expect.policyDigest);
  }));
});

describe('stage policy relations, through stage validation', () => {
  it.each(vectors.policyRelations.map((v) => [v.name, v] as const))('%s', (_name, vector) => {
    expect(stageCheckpointFieldError({ cardCheckpointPolicy: vector.policy as CardCheckpointPolicy }, true))
      .toBe(`cardCheckpointPolicy is invalid: ${vector.refuse}`);
  });
  it.each(vectors.policyRelations.map((v) => [v.name, v] as const))('%s refuses board creation', (_name, vector) => {
    const id = `brd_selectionrelation${serial++}`;
    return runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(id)), async (board) => {
      if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
      await expect(initPrivateCheckpointBoard(board, { id, tenantId: 'tnt_selectionvector', name: 'Relation', stages: [
        { key: 'test', name: 'Test', order: 0, ownerKind: 'capability', owner: 'code', cardCheckpointPolicy: vector.policy as CardCheckpointPolicy },
      ] })).rejects.toThrow(vector.refuse);
      expect((await board.getState()).boardId).toBeNull();
    });
  });
});

describe('structural vectors', () => {
  it.each(vectors.structural.policy.accept.map((c) => [c.name, c.body] as const))('policy accepts %s', (_name, body) => {
    expect(stageCheckpointFieldError({ cardCheckpointPolicy: body as CardCheckpointPolicy }, true)).toBeNull();
  });
  it.each(vectors.structural.policy.reject.map((c) => [c.name, c.body] as const))('policy refuses %s', (_name, body) => {
    expect(stageCheckpointFieldError({ cardCheckpointPolicy: body as CardCheckpointPolicy }, true)).not.toBeNull();
  });
  // A card's choice reaches the board through the route's reader: the same body a create sends.
  it.each(vectors.structural.card.accept.map((c) => [c.name, c.body] as const))('card choice accepts %s', (_name, body) => {
    expect(cardRepositoriesInput(body, false)).toEqual({ ok: true, value: body });
  });
  // The route reads `repositories` and `primaryRepository` off the card body, beside the card's
  // other fields, and checks the object they make against card-repositories.v1: the schema the
  // vectors state. `{}` and a stray field are object-level cases, so they are the schema's.
  it.each(vectors.structural.card.reject.map((c) => [c.name, c.body] as const))('card choice refuses %s', (_name, body) => {
    expect(isCardRepositories(body)).toBe(false);
    const sent: { repositories?: unknown; primaryRepository?: unknown } = body;
    if (sent.repositories !== undefined || sent.primaryRepository !== undefined) {
      if (Object.keys(body).every((k) => k === 'repositories' || k === 'primaryRepository')) expect(cardRepositoriesInput(sent, false).ok).toBe(false);
    }
  });
  it.each(vectors.structural.selection.accept.map((c) => [c.name, c.body] as const))('selection accepts %s', (_name, body) => {
    expect(isCheckpointSelection(body)).toBe(true);
  });
  it.each(vectors.structural.selection.reject.map((c) => [c.name, c.body] as const))('selection refuses %s', (_name, body) => {
    expect(isCheckpointSelection(body)).toBe(false);
  });
});

describe('canonical vectors', () => {
  const entry = (name: string) => {
    const found = canonical.cases.find((c) => c.name === name);
    if (!found) throw new Error(`no canonical case ${name}`);
    return found;
  };
  it.each(['policy-v2', 'selection', 'narrowed-policy', 'card-repositories'])('%s canonicalises and digests as treaty does', async (name) => {
    const c = entry(name);
    expect(canonicalCheckpoint(c.value)).toBe(c.canonical);
    expect(await checkpointDigest(c.value)).toBe(c.sha256);
  });
  it('the narrowed policy is what narrowing the v2 policy by api and app gives', async () => {
    const stage = parseCardCheckpointPolicy(new TextEncoder().encode(JSON.stringify(entry('policy-v2').value)));
    const narrowed = narrowCheckpointPolicy(stage, { repositories: ['api', 'app'] });
    if (!narrowed.ok) throw new Error(narrowed.refusal);
    expect(canonicalCheckpoint(narrowed.policy)).toBe(entry('narrowed-policy').canonical);
  });
});
