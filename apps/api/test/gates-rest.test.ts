import { SELF, env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import { boardStub } from '../src/board/stub';
import { cardReference } from '../src/routes/boards/cards';

const REVIEW_PIPELINE = [
  { key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
  { key: 'publish', name: 'Publish', order: 2, ownerKind: 'capability', owner: 'publish' },
];

const ARTIFACT_REVIEW_PIPELINE = [
  {
    key: 'research',
    name: 'Research',
    order: 0,
    ownerKind: 'capability',
    owner: 'research',
    completion: { reference: { provider: 'superlibrary', sourceType: 'artifact' } },
  },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
  { key: 'publish', name: 'Publish', order: 2, ownerKind: 'capability', owner: 'publish' },
];

const SUBMIT_PIPELINE = [
  { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build', gate: 'approval' },
  { key: 'ship', name: 'Ship', order: 1, ownerKind: 'capability', owner: 'ship' },
];

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return { 'X-Tenant-Id': 'tnt_a', 'Content-Type': 'application/json', ...extra };
}

async function createBoard(stages: unknown): Promise<string> {
  const res = await SELF.fetch('https://api.test/v1/boards', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name: 'Gated', stages }),
  });
  return ((await res.json()) as { boardId: string }).boardId;
}

async function addCard(boardId: string): Promise<string> {
  const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/cards`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ title: 'Work', ownerUserId: 'usr_a' }),
  });
  const { card } = await res.json<{ card: { id: string } }>();
  return card.id;
}

async function claim(boardId: string, agentId: string, capability: string) {
  const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/claims`, {
    method: 'POST',
    headers: headers({ 'X-Agent-Id': agentId }),
    body: JSON.stringify({ capabilities: [capability] }),
  });
  return (await res.json()) as { runId: string; leaseEpoch: number };
}

async function gateIdOf(boardId: string): Promise<string> {
  const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}`, { headers: headers() });
  const body = (await res.json()) as { gates: { id: string }[] };
  return body.gates[0]!.id;
}

async function linkArtifact(boardId: string, run: { runId: string; leaseEpoch: number }, agentId: string, version: number): Promise<void> {
  const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/runs/${run.runId}/references`, {
    method: 'POST',
    headers: headers({ 'X-Agent-Id': agentId }),
    body: JSON.stringify({
      leaseEpoch: run.leaseEpoch,
      url: 'https://app.superlibrary.dev/a/itm_0123456789abcdef',
      provider: 'superlibrary',
      sourceType: 'artifact',
      metadata: { version },
    }),
  });
  expect(res.status).toBe(200);
}

describe('gate REST surface', () => {
  it('refuses revised work when only the earlier run linked the artifact', async () => {
    // Regression caught: changing completion back to card-wide reference matching lets a stale
    // v1 satisfy an unlinked v2 rework, opening a gate over bytes the reviewer cannot reach.
    const boardId = await createBoard(ARTIFACT_REVIEW_PIPELINE);
    await addCard(boardId);

    const first = await claim(boardId, 'agt_r', 'research');
    await linkArtifact(boardId, first, 'agt_r', 1);
    await SELF.fetch(`https://api.test/v1/boards/${boardId}/runs/${first.runId}/complete`, {
      method: 'POST',
      headers: headers({ 'X-Agent-Id': 'agt_r' }),
      body: JSON.stringify({ leaseEpoch: first.leaseEpoch, handoff: { summary: 'spec v1' } }),
    });
    const firstGate = await gateIdOf(boardId);
    await SELF.fetch(`https://api.test/v1/boards/${boardId}/gates/${firstGate}/resolve`, {
      method: 'POST',
      headers: headers({ 'X-User-Id': 'usr_x' }),
      body: JSON.stringify({ decision: 'request_changes', comment: 'Revise the spec.' }),
    });

    const revised = await claim(boardId, 'agt_r', 'research');
    const completed = await SELF.fetch(`https://api.test/v1/boards/${boardId}/runs/${revised.runId}/complete`, {
      method: 'POST',
      headers: headers({ 'X-Agent-Id': 'agt_r' }),
      body: JSON.stringify({
        leaseEpoch: revised.leaseEpoch,
        handoff: { summary: 'spec v2', file: 'docs-voice-pass-spec-v2.md' },
      }),
    });
    expect(completed.status).toBe(200);
    const { card } = await completed.json<{
      card: { currentStageKey: string; state: string; handoff: unknown };
    }>();
    expect(card, 'the stale v1 reference must not open a gate for an unlinked v2').toMatchObject({
      currentStageKey: 'research',
      state: 'submitted',
    });
    expect(JSON.stringify(card.handoff)).toMatch(/refused.*superlibrary.*(this|current) run/i);
  });

  it('accepts an artifact a person linked for the current run', async () => {
    const boardId = await createBoard(ARTIFACT_REVIEW_PIPELINE);
    const cardId = await addCard(boardId);
    const run = await claim(boardId, 'agt_r', 'research');
    const linked = await SELF.fetch(`https://api.test/v1/boards/${boardId}/cards/${cardId}/references`, {
      method: 'PUT',
      headers: headers({ 'X-User-Id': 'usr_x' }),
      body: JSON.stringify({
        url: 'https://app.superlibrary.dev/a/itm_0123456789abcdef',
        provider: 'superlibrary',
        sourceType: 'artifact',
        metadata: { version: 2 },
      }),
    });
    expect(linked.status).toBe(200);
    expect((await linked.json<{ reference: { addedBy: string } }>()).reference.addedBy).toBe('user');

    const completed = await SELF.fetch(`https://api.test/v1/boards/${boardId}/runs/${run.runId}/complete`, {
      method: 'POST',
      headers: headers({ 'X-Agent-Id': 'agt_r' }),
      body: JSON.stringify({ leaseEpoch: run.leaseEpoch, handoff: { summary: 'spec v2' } }),
    });
    expect(completed.status).toBe(200);
    const { card } = await completed.json<{ card: { currentStageKey: string; state: string } }>();
    expect(card).toMatchObject({ currentStageKey: 'review', state: 'input-required' });
  });

  it('does not let an agent spoof a person-linked artifact to satisfy completion', async () => {
    const boardId = await createBoard(ARTIFACT_REVIEW_PIPELINE);
    const cardId = await addCard(boardId);
    const run = await claim(boardId, 'agt_r', 'research');
    const url = new URL(`https://api.test/v1/boards/${boardId}/cards/${cardId}/references`);
    const request = new Request(url, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({
        url: 'https://app.superlibrary.dev/a/itm_0123456789abcdef',
        provider: 'superlibrary',
        sourceType: 'artifact',
        addedBy: 'user',
      }),
    });
    const rest = `cards/${cardId}/references`;
    const refMatch = rest.match(/^cards\/([^/]+)\/references$/);
    if (!refMatch) throw new Error('reference route did not match');
    const linked = await cardReference(
      {
        request,
        env,
        url,
        tenantId: 'tnt_a',
        boardId,
        rest,
        user: null,
        agent: { tenantId: 'tnt_a', agentId: 'agt_r', capabilities: null },
        stub: boardStub(env, 'tnt_a', boardId),
      },
      refMatch,
    );
    expect(linked.status).toBe(200);
    expect((await linked.json<{ reference: { addedBy: string } }>()).reference.addedBy).toBe('agent');

    const completed = await SELF.fetch(`https://api.test/v1/boards/${boardId}/runs/${run.runId}/complete`, {
      method: 'POST',
      headers: headers({ 'X-Agent-Id': 'agt_r' }),
      body: JSON.stringify({ leaseEpoch: run.leaseEpoch, handoff: { summary: 'spec v2' } }),
    });
    expect(completed.status).toBe(200);
    const { card } = await completed.json<{ card: { currentStageKey: string; state: string; handoff: unknown } }>();
    expect(card).toMatchObject({ currentStageKey: 'research', state: 'submitted' });
    expect(JSON.stringify(card.handoff)).toMatch(/refused.*superlibrary.*(this|current) run/i);
  });

  it('opens a gate on review and approves it via REST', async () => {
    const boardId = await createBoard(REVIEW_PIPELINE);
    await addCard(boardId);
    const c = await claim(boardId, 'agt_r', 'research');
    await SELF.fetch(`https://api.test/v1/boards/${boardId}/runs/${c.runId}/complete`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ leaseEpoch: c.leaseEpoch, handoff: { summary: 'drafted' } }),
    });

    const gateId = await gateIdOf(boardId);
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/gates/${gateId}/resolve`, {
      method: 'POST',
      headers: headers({ 'X-User-Id': 'usr_x' }),
      body: JSON.stringify({ decision: 'approve' }),
    });
    expect(res.status).toBe(200);
    const { card } = (await res.json()) as { card: { currentStageKey: string } };
    expect(card.currentStageKey).toBe('publish');
  });

  it('rejects a self-resolved gate with 403 (separation of duties)', async () => {
    const boardId = await createBoard(REVIEW_PIPELINE);
    await addCard(boardId);
    const c = await claim(boardId, 'agt_r', 'research');
    await SELF.fetch(`https://api.test/v1/boards/${boardId}/runs/${c.runId}/complete`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ leaseEpoch: c.leaseEpoch }),
    });
    const gateId = await gateIdOf(boardId);
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/gates/${gateId}/resolve`, {
      method: 'POST',
      headers: headers({ 'X-User-Id': 'agt_r' }), // the producer trying to approve itself
      body: JSON.stringify({ decision: 'approve' }),
    });
    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated gate resolve (identity comes from auth, not a header)', async () => {
    const boardId = await createBoard(REVIEW_PIPELINE);
    await addCard(boardId);
    const c = await claim(boardId, 'agt_r', 'research');
    await SELF.fetch(`https://api.test/v1/boards/${boardId}/runs/${c.runId}/complete`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ leaseEpoch: c.leaseEpoch }),
    });
    const gateId = await gateIdOf(boardId);
    // No auth at all (no session, no dev tenant header) → 401.
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/gates/${gateId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'approve' }),
    });
    expect(res.status).toBe(401);
  });

  it('submits a gated agent stage for review via REST', async () => {
    const boardId = await createBoard(SUBMIT_PIPELINE);
    await addCard(boardId);
    const c = await claim(boardId, 'agt_build', 'build');
    const res = await SELF.fetch(`https://api.test/v1/boards/${boardId}/runs/${c.runId}/submit`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ leaseEpoch: c.leaseEpoch }),
    });
    expect(res.status).toBe(200);
    const { card } = (await res.json()) as { card: { state: string } };
    expect(card.state).toBe('input-required');
  });
});
