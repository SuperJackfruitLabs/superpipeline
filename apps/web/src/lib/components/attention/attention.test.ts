/**
 * What the Needs-you panel says about each card, and what it offers to do about it.
 *
 * The panel used to read only "is there a gate / a question / a failure", and called every other
 * `input-required` card "not dispatched — nobody with permission asked for it", with a link to
 * staff an agent. That was wrong for a card its own agent blocked, one the breaker stopped, and one
 * refused twice at its completion check — the card said why, and the panel did not read it.
 */
import { describe, it, expect } from 'vitest';
import { itemsFromBoard, itemsFromStale } from './attention';
import type { BoardSnapshot, Card, Gate, Elicitation, StaleCard } from '$lib/api';

const NOW = Date.parse('2026-10-08T12:00:00.000Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();

function card(over: Partial<Card>): Card {
  return {
    id: 'crd_1', title: 'Add login', ownerUserId: 'usr_a', currentStageKey: 'build', state: 'submitted', priority: 0,
    costUsd: 0, overBudget: false, attemptCount: 0, queuedBy: null, queuedByAgentId: null, queuedGrant: null, labels: [],
    dueAt: null, archivedAt: null, parentCardId: null, openChildCount: 0, costUsdRollup: 0, blockedBy: [], projectId: null,
    milestoneId: null, stateSince: hoursAgo(1), lastAgentId: null, queuedGrantOwner: null, stageSince: hoursAgo(1), createdAt: hoursAgo(5), ...over,
  };
}

function board(cards: Card[], extra: Partial<BoardSnapshot> = {}): BoardSnapshot {
  return {
    boardId: 'brd_1', tenantId: 't', name: 'Releases',
    stages: [
      { key: 'requested', name: 'Requested', order: 0, ownerKind: 'human' },
      { key: 'build', name: 'Build', order: 1, ownerKind: 'capability', owner: 'build' },
      { key: 'review', name: 'Review', order: 2, ownerKind: 'human', gate: 'approval' },
      { key: 'done', name: 'Done', order: 3, ownerKind: 'human' },
    ],
    cards, gates: [], elicitations: [], references: [],
    usage: { totalCostUsd: 0, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: null, overBudget: false },
    github: { issueTrigger: false, webhookConfigured: false, triggerGrantCount: null },
    stale: { enabled: true, afterHours: 24 },
    ...extra,
  } as BoardSnapshot;
}

const one = (b: BoardSnapshot) => {
  const items = itemsFromBoard(b, [], NOW);
  expect(items).toHaveLength(1);
  return items[0]!;
};

describe('itemsFromBoard — one row per reason, each saying what to do', () => {
  it("blocked: the agent's own words, and Resume", () => {
    const it = one(board([card({ state: 'input-required', needsHuman: { reason: 'blocked', detail: 'the staging database is down' } })]));
    expect(it.kind).toBe('blocked');
    expect(it.detail).toBe('the staging database is down');
    expect(it.instruction).toMatch(/resume/i);
    expect(it.actions).toEqual(['resume', 'open', 'log']);
  });

  it('repeated-failure: the count and the last reason, with Resume and Open log', () => {
    const it = one(board([card({ state: 'input-required', needsHuman: { reason: 'repeated-failure', failureCount: 2, detail: 'out of memory' } })]));
    expect(it.kind).toBe('repeated-failure');
    expect(it.headline).toContain('2');
    expect(it.detail).toBe('out of memory');
    expect(it.actions).toEqual(['resume', 'open', 'log']);
  });

  it('a completion-check park reads as blocked, with both refusals in the detail', () => {
    const detail = 'this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit';
    const it = one(board([card({ state: 'input-required', needsHuman: { reason: 'blocked', detail } })]));
    expect(it.kind).toBe('blocked');
    expect(it.detail).toBe(detail);
    expect(it.actions).not.toContain('staff');
  });

  it("not-authorised keeps today's refused wording and Staff an agent", () => {
    const it = one(board([card({ state: 'input-required', needsHuman: { reason: 'not-authorised', detail: 'queued without an authorising token' } })]));
    expect(it.kind).toBe('refused');
    expect(it.headline).toContain('not dispatched');
    expect(it.actions).toEqual(['staff']);
  });

  it('question: Answer, with the question as the detail', () => {
    const ask: Elicitation = { id: 'elc_1', cardId: 'crd_1', runId: 'run_1', stageKey: 'build', agentId: 'agt_b', question: 'Which provider?', signal: null, options: [], status: 'pending', answer: null, createdAt: hoursAgo(1) };
    const it = one(board([card({ state: 'input-required', needsHuman: { reason: 'question', elicitationId: 'elc_1' } })], { elicitations: [ask] }));
    expect(it.kind).toBe('question');
    expect(it.detail).toBe('Which provider?');
    expect(it.actions).toEqual(['answer']);
  });

  it('review: says what is being approved, and offers Review — never an approve from the list', () => {
    const gate: Gate = { id: 'gate_1', cardId: 'crd_1', stageKey: 'review', status: 'pending', options: [], producedBy: 'agt_b', summary: 'Adds the login form and its tests' };
    const it = one(board([card({ currentStageKey: 'review', state: 'input-required' })], { gates: [gate] }));
    expect(it.kind).toBe('review');
    expect(it.detail).toBe('Adds the login form and its tests');
    expect(it.actions).toEqual(['review']);
    expect(it.actions).not.toContain('approve' as never);
  });

  it('failed and over budget as before', () => {
    expect(one(board([card({ state: 'failed' })])).kind).toBe('failed');
    expect(one(board([card({ overBudget: true })])).kind).toBe('budget');
  });

  it('a card sitting in a stage nothing claims, past the threshold: "Nothing claims stage", with Move', () => {
    const it = one(board([card({ currentStageKey: 'requested', stateSince: hoursAgo(30) })]));
    expect(it.kind).toBe('no-owner');
    expect(it.headline).toBe('nothing claims the Requested stage');
    expect(it.actions).toEqual(['move', 'open', 'staff']);
  });

  it('…but not before the threshold, not when the board switched it off, and never for a claimable stage', () => {
    expect(itemsFromBoard(board([card({ currentStageKey: 'requested', stateSince: hoursAgo(2) })]), [], NOW)).toEqual([]);
    expect(itemsFromBoard(board([card({ currentStageKey: 'requested', stateSince: hoursAgo(30) })], { stale: { enabled: false, afterHours: 24 } }), [], NOW)).toEqual([]);
    expect(itemsFromBoard(board([card({ currentStageKey: 'build', stateSince: hoursAgo(300) })]), [], NOW)).toEqual([]);
  });

  it('leaves archived cards and healthy ones out', () => {
    expect(itemsFromBoard(board([card({ archivedAt: hoursAgo(1), state: 'failed' }), card({ id: 'crd_2' })]), [], NOW)).toEqual([]);
  });
});

describe('itemsFromStale — the workspace list uses the same rows', () => {
  const stale = (over: Partial<StaleCard>): StaleCard => ({
    boardId: 'brd_9', boardName: 'Ops', cardId: 'crd_9', title: 'Rotate keys', ownerUserId: 'usr_a', stageKey: 'build',
    stageName: 'Build', state: 'input-required', why: { kind: 'needs-human', reason: 'blocked', detail: 'vault sealed' },
    summary: null, since: hoursAgo(5), ageHours: 5, next: 'resume it', ...over,
  });

  it('maps each reason to the board panel kinds; a stopped card offers Resume and Open (the reference draws no log here)', () => {
    const [blocked, refused, review, ownerless] = itemsFromStale([
      stale({}),
      stale({ cardId: 'a', why: { kind: 'needs-human', reason: 'not-authorised' } }),
      stale({ cardId: 'b', why: { kind: 'needs-human', reason: 'review', gateId: 'gate_1' }, summary: 'the release notes' }),
      stale({ cardId: 'c', state: 'submitted', stageKey: 'requested', stageName: 'Requested', why: { kind: 'no-owner' } }),
    ]);
    expect(blocked).toMatchObject({ kind: 'blocked', detail: 'vault sealed', boardId: 'brd_9', boardName: 'Ops', actions: ['resume', 'open'] });
    expect(refused).toMatchObject({ kind: 'refused', actions: ['staff'] });
    expect(review).toMatchObject({ kind: 'review', detail: 'the release notes', actions: ['review'] });
    expect(ownerless).toMatchObject({ kind: 'no-owner', headline: 'nothing claims the Requested stage' });
  });
});

import { sortAttention } from './attention';
import { C1DFC, C4605, C58F8, C63AC, DX_AGENTS, DX_BOARD, DX_NOW } from '$lib/test/dx-snapshot';

describe('itemsFromBoard on the Developer Experience board', () => {
  const items = itemsFromBoard(DX_BOARD, DX_AGENTS, DX_NOW);

  it('finds the four cards that need a person, each with its stage name', () => {
    expect(items.map((i) => [i.cardId, i.kind, i.stageName])).toEqual([
      [C4605.id, 'blocked', 'Reproduce'],
      [C58F8.id, 'blocked', 'Failing test'],
      [C63AC.id, 'no-owner', 'Reported'],
      [C1DFC.id, 'blocked', 'Fix'],
    ]);
  });

  it('says which stage nothing claims, by its name', () => {
    expect(items.find((i) => i.kind === 'no-owner')).toMatchObject({ headline: 'nothing claims the Reported stage', actions: ['move', 'open', 'staff'], stageOrder: 0, attemptCount: 0 });
  });

  it('a stopped card offers resume, open and the log', () => {
    expect(items.find((i) => i.cardId === C1DFC.id)).toMatchObject({ actions: ['resume', 'open', 'log'], stageOrder: 3, attemptCount: 5 });
  });
});

describe('sortAttention', () => {
  const items = itemsFromBoard(DX_BOARD, DX_AGENTS, DX_NOW);
  const ids = (list: ReturnType<typeof sortAttention>) => list.map((i) => i.cardId);

  it('stage mode: stage order, the unclaimed card last (Daylight, Paper, Studio)', () => {
    expect(ids(sortAttention(items, 'stage'))).toEqual([C4605.id, C58F8.id, C1DFC.id, C63AC.id]);
  });

  it('urgency mode: most attempts first, the unclaimed card last (Quiet)', () => {
    expect(ids(sortAttention(items, 'urgency'))).toEqual([C1DFC.id, C4605.id, C58F8.id, C63AC.id]);
  });

  it('breaks a tie by age, oldest first, then by title', () => {
    const a = { ...items[0]!, cardId: 'a', title: 'B', stageOrder: 1, ageHours: 5 };
    const b = { ...items[0]!, cardId: 'b', title: 'A', stageOrder: 1, ageHours: 9 };
    const c = { ...items[0]!, cardId: 'c', title: 'A', stageOrder: 1, ageHours: 5 };
    expect(ids(sortAttention([a, b, c], 'stage'))).toEqual(['b', 'c', 'a']);
  });

  it('does not reorder the array it was given', () => {
    const copy = [...items];
    sortAttention(items, 'urgency');
    expect(items).toEqual(copy);
  });
});

describe('itemsFromStale keeps the workspace actions', () => {
  it('a workspace no-owner row offers open only (the reference draws Open alone), never move', () => {
    const [row] = itemsFromStale([{ boardId: 'brd_9', boardName: 'Ops', cardId: 'c', title: 'T', ownerUserId: 'u', stageKey: 'requested', stageName: 'Requested', state: 'submitted', why: { kind: 'no-owner' }, summary: null, since: '2026-10-10T00:00:00Z', ageHours: 30, next: 'move it' }]);
    expect(row).toMatchObject({ kind: 'no-owner', stageName: 'Requested', headline: 'nothing claims the Requested stage', actions: ['open'] });
  });
});

describe('the workspace feed', () => {
  it('names the stage nothing claims', () => {
    const [item] = itemsFromStale([{
      boardId: 'brd_134a0ddb6d434478', boardName: 'Developer Experience', cardId: 'card_ace250c9c25363ac', title: 'Fix the highest-severity blocker found in the clean-room journey',
      ownerUserId: 'usr_b19776fac3c94df4', stageKey: 'reported', stageName: 'Reported', state: 'submitted', why: { kind: 'no-owner' }, summary: null,
      since: '2026-10-08T09:51:00Z', ageHours: 70.5, next: '',
    }]);
    expect(item!.headline).toBe('nothing claims the Reported stage');
    expect(item!.stageName).toBe('Reported');
    expect(item!.actions).toEqual(['open']);
  });
});

describe('workspace ages', () => {
  it('are measured on the viewer\'s clock from `since`, not the server\'s ageHours', () => {
    const [item] = itemsFromStale([{
      boardId: 'brd_134a0ddb6d434478', boardName: 'Developer Experience', cardId: 'card_x', title: 'T', ownerUserId: 'usr_b19776fac3c94df4', stageKey: 'fix', stageName: 'Fix', state: 'input-required',
      why: { kind: 'needs-human', reason: 'blocked' }, summary: null, since: '2026-10-10T08:21:00Z', ageHours: 99, next: '',
    }], Date.parse('2026-10-11T08:21:00Z'));
    expect(item!.ageHours).toBe(24);
  });
});
