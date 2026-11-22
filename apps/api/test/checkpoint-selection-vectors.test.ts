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
import { parseCheckpointPolicy } from '../src/board/checkpoint-proposal';
import { cardRepositoriesInput } from '../src/routes/fields';
import vectors from './fixtures/checkpoint-settlement/selection.json';
import canonical from './fixtures/checkpoint-settlement/canonical.json';

const V1 = 'superpipeline.checkpoint-claim.v1';
const V2 = 'superpipeline.checkpoint-claim.v2';
const stages: Record<string, unknown> = vectors.stages;
let serial = 0;
/**
 * A stage policy value handed to validation as it came off the wire: unparsed, which is what the
 * write path sees. The validators take `unknown`; this only satisfies the stage field's type.
 */
function parseUnchecked(value: unknown): CardCheckpointPolicy {
  const holder: { cardCheckpointPolicy?: CardCheckpointPolicy } = {};
  Reflect.set(holder, 'cardCheckpointPolicy', value);
  if (!holder.cardCheckpointPolicy) throw new Error('no policy');
  return holder.cardCheckpointPolicy;
}

const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
/** A vector's card choice as the board takes it, or undefined when it names none. */
function choiceOf(card: { repositories?: string[]; primaryRepository?: string }): CardRepositories | undefined {
  if (!card.repositories) return undefined;
  return { repositories: card.repositories, ...(card.primaryRepository ? { primaryRepository: card.primaryRepository } : {}) };
}
/** The vector stage as a board stage: a v2 policy in `cardCheckpointPolicy`, a v1 one in `checkpointPolicy`. */
function vectorStage(name: string): StageDef {
  const policy = stages[name];
  const stage: StageDef = { key: 'test', name: 'Test', order: 0, ownerKind: 'capability', owner: 'code' };
  const isV2 = typeof policy === 'object' && policy !== null && 'version' in policy && policy.version === 'superpipeline.checkpoint-policy.v2';
  return isV2 ? { ...stage, cardCheckpointPolicy: parseCardCheckpointPolicy(encode(policy)) } : { ...stage, checkpointPolicy: parseCheckpointPolicy(encode(policy)) };
}
function canonicalCase(name: string) {
  const found = canonical.cases.find((c) => c.name === name);
  if (!found) throw new Error(`no canonical case ${name}`);
  return found;
}

/** A board whose one stage carries the named vector stage policy, in its v1 or v2 field. */
async function onStage(name: string, check: (board: BoardDO, state: DurableObjectState) => Promise<void>) {
  const id = `brd_selectionvector${serial++}`;
  await runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(id)), async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    await initPrivateCheckpointBoard(board, { id, tenantId: 'tnt_selectionvector', name: 'Vectors', stages: [vectorStage(name)] });
    try { await check(board, state); } finally { await state.storage.deleteAlarm(); }
  });
}
const claimant = { agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: V1, checkpointProtocols: [V1, V2] };
const claimed = vectors.narrowing.flatMap((v) => (v.expect ? [[v.name, v.stage, v.card, v.expect] as const] : []));
const refusedOnEntry = vectors.narrowing.flatMap((v) => (v.refuse && v.refuse !== 'needs-person' ? [[v.name, v.stage, v.card, v.refuse] as const] : []));
const waits = vectors.narrowing.flatMap((v) => (v.refuse === 'needs-person' ? [[v.name, v.stage] as const] : []));

describe('narrowing vectors, through a real claim', () => {
  it.each(claimed)('%s', (_name, stage, card, expected) => onStage(stage, async (board) => {
    const choice = choiceOf(card);
    const made = await board.createCard({ title: 'Vector', ownerUserId: 'usr_vector', ...(choice ? { repositories: choice } : {}) });
    expect(made.ok).toBe(true);
    const claim = await board.claim(claimant);
    if (!claim.claimed || !claim.checkpointClaim) throw new Error('expected a checkpoint claim');
    expect(claim.checkpointClaim.policy).toEqual(expected.policy);
    expect(claim.checkpointClaim.policyDigest).toBe(expected.policyDigest);
    // A v2 stage's claim carries exactly the vector's selection; a v1 stage's carries none.
    expect(claim.checkpointClaim.selection).toEqual('selection' in expected ? expected.selection : undefined);
    // The claimant never sees the internal copy of the stage policy.
    expect(claim.checkpointClaim).not.toHaveProperty('stagePolicy');
  }));
  it.each(refusedOnEntry)('%s is refused on entry and stores nothing', (_name, stage, card, refuse) => onStage(stage, async (board, state) => {
    const choice = choiceOf(card);
    expect(await board.createCard({ title: 'Vector', ownerUserId: 'usr_vector', ...(choice ? { repositories: choice } : {}) }))
      .toMatchObject({ ok: false, code: 'REPOSITORY_CHOICE_REFUSED', detail: { reason: refuse } });
    expect(state.storage.sql.exec('SELECT COUNT(*) AS n FROM cards').one().n).toBe(0);
  }));
  it.each(waits)('%s: parked, visibly, and never benched with the whole allowlist', (_name, stage) => onStage(stage, async (board, state) => {
    const made = await board.createCard({ title: 'Vector', ownerUserId: 'usr_vector' });
    expect(made.ok).toBe(true);
    expect(await board.claim(claimant)).toMatchObject({ claimed: false });
    expect(state.storage.sql.exec('SELECT state FROM cards').one().state).toBe('input-required');
    const parked = await board.getCardView(made.ok ? made.value.id : '');
    expect(parked).toMatchObject({ ok: true, value: { needsHuman: { reason: 'blocked' } } });
    expect(state.storage.sql.exec('SELECT * FROM runs').toArray()).toEqual([]);
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
    expect(stageCheckpointFieldError({ cardCheckpointPolicy: parseUnchecked(vector.policy) }, true))
      .toBe(`cardCheckpointPolicy is invalid: ${vector.refuse}`);
  });
  it.each(vectors.policyRelations.map((v) => [v.name, v] as const))('%s refuses board creation', (_name, vector) => {
    const id = `brd_selectionrelation${serial++}`;
    return runInDurableObject(env.BOARD_DO.get(env.BOARD_DO.idFromName(id)), async (board) => {
      if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
      await expect(initPrivateCheckpointBoard(board, { id, tenantId: 'tnt_selectionvector', name: 'Relation', stages: [
        { key: 'test', name: 'Test', order: 0, ownerKind: 'capability', owner: 'code', cardCheckpointPolicy: parseUnchecked(vector.policy) },
      ] })).rejects.toThrow(vector.refuse);
      expect((await board.getState()).boardId).toBeNull();
    });
  });
});

describe('structural vectors', () => {
  it.each(vectors.structural.policy.accept.map((c) => [c.name, c.body] as const))('policy accepts %s', (_name, body) => {
    expect(stageCheckpointFieldError({ cardCheckpointPolicy: parseUnchecked(body) }, true)).toBeNull();
  });
  it.each(vectors.structural.policy.reject.map((c) => [c.name, c.body] as const))('policy refuses %s', (_name, body) => {
    expect(stageCheckpointFieldError({ cardCheckpointPolicy: parseUnchecked(body) }, true)).not.toBeNull();
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
  });
  // Those the route can be sent as card fields, it refuses too.
  const asFields = vectors.structural.card.reject.filter((c) => Object.keys(c.body).length > 0 &&
    Object.keys(c.body).every((k) => k === 'repositories' || k === 'primaryRepository'));
  it.each(asFields.map((c) => [c.name, c.body] as const))('the card route refuses %s', (_name, body) => {
    expect(cardRepositoriesInput(body, false).ok).toBe(false);
  });
  it.each(vectors.structural.selection.accept.map((c) => [c.name, c.body] as const))('selection accepts %s', (_name, body) => {
    expect(isCheckpointSelection(body)).toBe(true);
  });
  it.each(vectors.structural.selection.reject.map((c) => [c.name, c.body] as const))('selection refuses %s', (_name, body) => {
    expect(isCheckpointSelection(body)).toBe(false);
  });
});

describe('canonical vectors', () => {
  const entry = canonicalCase;
  it.each(['policy-v2', 'selection', 'narrowed-policy', 'card-repositories'])('%s canonicalises and digests as treaty does', async (name) => {
    const c = entry(name);
    expect(canonicalCheckpoint(c.value)).toBe(c.canonical);
    expect(await checkpointDigest(c.value)).toBe(c.sha256);
  });
  it('the narrowed policy is what narrowing the v2 policy by api and app gives', async () => {
    const stage = parseCardCheckpointPolicy(encode(entry('policy-v2').value));
    const narrowed = narrowCheckpointPolicy(stage, { repositories: ['api', 'app'] });
    if (!narrowed.ok) throw new Error(narrowed.refusal);
    expect(canonicalCheckpoint(narrowed.policy)).toBe(entry('narrowed-policy').canonical);
  });
});
