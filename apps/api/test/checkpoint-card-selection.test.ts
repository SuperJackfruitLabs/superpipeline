/**
 * A card that chose its repositories, end to end through the real routes: a v2 claim, source
 * admission, settlement, commit references and the receipt read all compare with the claim's
 * frozen narrowed policy, never with the stage's whole allowlist.
 */
import { initPrivateCheckpointBoard } from './helpers/checkpoint-policy';
import { env, runInDurableObject } from 'cloudflare:test';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { BoardDO } from '../src/board/board-do';
import type { BoardContext } from '../src/board/context';
import { boards } from '../src/routes/boards/entry';
import { ensureOrgTenant } from '../src/auth/org-tenancy';
import type { CardCheckpointPolicy } from '../src/board/checkpoint-selection';
import corpus from './fixtures/checkpoint-settlement/cases.json';
import vectors from './fixtures/checkpoint-settlement/selection.json';
import { setupCatalog } from './helpers/catalog';
import { withReporting, trackBoard, quietBoards } from './helpers/superwitness';
import { withOrgPlane, planeEnv, planeToken, SERVICE, ORG } from './helpers/org-plane';

beforeAll(setupCatalog);
afterEach(quietBoards);
let serial = 0;
const stagePolicy: CardCheckpointPolicy = { ...(vectors.stages.chooses as CardCheckpointPolicy), reporterPrincipalId: SERVICE };
const subset = vectors.narrowing.find((v) => v.name === 'card-chooses-a-subset');

async function token(scope = 'checkpoints:submit') {
  return planeToken({ sub: SERVICE, org: ORG, principalKind: 'service', scope });
}
async function send(path: string, auth: string, method = 'POST', body = '{}') {
  const request = new Request(`https://api.test${path}`, { method, headers: { authorization: `Bearer ${auth}` }, ...(method === 'POST' ? { body } : {}) });
  const match = path.match(/^\/v1\/boards\/([^/]+)\/(.*)$/);
  if (!match) throw new Error('invalid fixture path');
  return boards({ request, path, url: new URL(request.url), env: planeEnv({ PROPOSED_CHECKPOINT_SOURCE: 'true', PROPOSED_CHECKPOINT_SETTLEMENT: 'true' }) }, match);
}

it('claims, admits, settles, references and reads back over the narrowed repositories only', () => withReporting(() => withOrgPlane(async () => {
  const tenantId = await ensureOrgTenant(env.DB, ORG);
  await env.DB.prepare('UPDATE tenants SET forge_host=? WHERE id=?').bind('forge.example.test', tenantId).run();
  const id = `brd_cardselection${serial++}`;
  const stub = trackBoard(env.BOARD_DO.get(env.BOARD_DO.idFromName(`${tenantId}:${id}`)));
  const inspect = <T>(fn: (b: BoardDO, c: BoardContext, s: DurableObjectState) => T | Promise<T>) => runInDurableObject(stub, async (board, state) => {
    if (!(board instanceof BoardDO)) throw new Error('expected BoardDO');
    return fn(board, Reflect.get(board, 'board'), state);
  });
  const claimed = await inspect(async (board, context) => {
    context.env.PROPOSED_CHECKPOINT_SOURCE = 'true';
    context.env.PROPOSED_CHECKPOINT_SETTLEMENT = 'true';
    await initPrivateCheckpointBoard(board, { id, tenantId, name: 'Chosen', stages: [
      { key: 'test', name: 'Test', order: 0, ownerKind: 'capability', owner: 'code', cardCheckpointPolicy: stagePolicy },
      { key: 'review', name: 'Review', order: 1, ownerKind: 'human' },
    ] });
    const made = await board.createCard({ title: 'Two repositories', ownerUserId: 'usr_example', repositories: { repositories: ['api', 'app'] } });
    if (!made.ok) throw new Error(made.message);
    const claim = await board.claim({ agentId: 'agt_example', capabilities: ['code'], checkpointProtocol: 'superpipeline.checkpoint-claim.v1',
      checkpointProtocols: ['superpipeline.checkpoint-claim.v1', 'superpipeline.checkpoint-claim.v2'] });
    if (!claim.claimed || !claim.checkpointClaim) throw new Error('expected a checkpoint claim');
    return { cardId: made.value.id, claim };
  });
  try {
    const { cardId, claim } = claimed;
    // The digest is the narrowed policy's (the vector's own, with this test's reporter).
    expect(claim.checkpointClaim?.policy.repositories).toEqual(subset?.expect?.policy.repositories);
    const base = corpus.producerBaseline.settlementRequest;
    const binding = { ...base.checkpoint.binding, boardId: id, cardId, runId: claim.runId, leaseEpoch: claim.leaseEpoch };
    const start = [{ name: 'api', commit: '9'.repeat(40) }, { name: 'app', commit: 'b'.repeat(40) }];
    const member = (name: string, repository: string, provider: string) => ({ name, provider, repository, branch: `card/${cardId}`, objectFormat: 'sha1', commit: 'a'.repeat(40) });
    const prefix = `/v1/boards/${id}/runs/${claim.runId}`;
    const source = { binding, start, benchKey: cardId, benchId: base.checkpoint.checkpoint.benchId, requestId: base.checkpoint.checkpoint.requestId,
      sourceRequestSha256: base.checkpoint.sourceRequestSha256, workerContextSha256: '4'.repeat(64) };
    const whole = { ...source, start: [...start, { name: 'docs', commit: 'd'.repeat(40) }] };
    const wholeSent = await send(`${prefix}/checkpoint-source`, await token(), 'POST', JSON.stringify(whole));
    expect(await wholeSent.json()).toMatchObject({ error: { code: 'INVALID_CHECKPOINT_SOURCE' } });
    expect((await send(`${prefix}/checkpoint-source`, await token(), 'POST', JSON.stringify(source))).status).toBe(200);
    const read = await send(`${prefix}/checkpoint-source`, await token('checkpoints:read'), 'GET');
    expect(await read.json()).toMatchObject({ policy: claim.checkpointClaim?.policy, selection: claim.checkpointClaim?.selection });

    const settlement = (members: ReturnType<typeof member>[], starts = start) => JSON.stringify({ ...base, checkpoint: { ...base.checkpoint,
      binding, start: starts, policyDigest: claim.checkpointClaim?.policyDigest,
      checkpoint: { ...base.checkpoint.checkpoint, key: cardId, checkpointRepository: 'app', members } } });
    // A report over the whole allowlist is not this claim's: refused, and nothing settles.
    const allowlist = settlement([member('api', 'example/api', 'forge'), member('app', 'example/app', 'forge'), member('docs', 'example/docs', 'github')],
      [...start, { name: 'docs', commit: 'd'.repeat(40) }]);
    const refused = await send(`${prefix}/checkpoint-settlements`, await token(), 'POST', allowlist);
    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({ error: { code: 'STALE_LEASE' } });
    const settled = await send(`${prefix}/checkpoint-settlements`, await token(), 'POST', settlement([member('api', 'example/api', 'forge'), member('app', 'example/app', 'forge')]));
    expect(settled.status).toBe(200);
    const receipt = await settled.json();
    expect(receipt).toMatchObject({ runId: claim.runId, checkpoint: { members: [{ name: 'api' }, { name: 'app' }] } });
    await inspect((_board, context, state) => {
      expect(context.getRunRow(claim.runId)).toMatchObject({ status: 'ended', outcome: 'completed' });
      expect(state.storage.sql.exec('SELECT url FROM card_references ORDER BY url').toArray().map((r) => r.url)).toEqual([
        `https://forge.example.test/example/api/commit/${'a'.repeat(40)}`, `https://forge.example.test/example/app/commit/${'a'.repeat(40)}`,
      ]);
    });
    expect(await (await send(`${prefix}/checkpoint`, await token('checkpoints:read'), 'GET')).json()).toEqual(receipt);
  } finally {
    await inspect(async (_board, context, state) => {
      delete context.env.PROPOSED_CHECKPOINT_SOURCE;
      delete context.env.PROPOSED_CHECKPOINT_SETTLEMENT;
      await state.storage.deleteAlarm();
    });
  }
})));
