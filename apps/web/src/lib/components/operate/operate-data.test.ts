// apps/web/src/lib/components/operate/operate-data.test.ts
import { describe, expect, it } from 'vitest';
import { itemsFromBoard, sortAttention } from '$lib/components/attention/attention';
import { activityGroups, mergeUsage, moveTargets, needRows, parseCap, runningRows, spendView, crewOf } from './operate-data';
import { C1DFC, C4605, C58F8, C63AC, DX_AGENTS, DX_BOARD, DX_NOTIFICATIONS, DX_NOW } from '$lib/test/dx-snapshot';

const items = itemsFromBoard(DX_BOARD, DX_AGENTS, DX_NOW);
const rows = needRows(DX_BOARD, DX_AGENTS, sortAttention(items, 'stage'), DX_NOW);

describe('needRows', () => {
  it('the agent that last worked the card, its stage and its position', () => {
    expect(rows.map((r) => [r.card.id, r.agentName, r.stage.name, r.stageIndex, r.overdue])).toEqual([
      [C4605.id, 'error-eric', 'Reproduce', 2, false],
      [C58F8.id, 'tester-tim', 'Failing test', 3, false],
      [C1DFC.id, 'coder-kai', 'Fix', 4, false],
      [C63AC.id, null, 'Reported', 1, true],
    ]);
  });
  it('the crew is each needs agent once, in row order', () => {
    expect(crewOf(rows).map((c) => c.name)).toEqual(['error-eric', 'tester-tim', 'coder-kai']);
  });
});

describe('activityGroups', () => {
  const groups = activityGroups(DX_NOTIFICATIONS, false, rows, DX_BOARD, DX_AGENTS);
  it('one group per card, newest first, with the rest behind Earlier', () => {
    expect(groups.map((g) => [g.cardId, g.latest.createdAt, g.earlier.length, g.need?.item.kind ?? null])).toEqual([
      [C1DFC.id, '2026-10-10T22:50:12Z', 4, 'blocked'],
      [C58F8.id, '2026-10-10T22:25:12Z', 4, 'blocked'],
      [C4605.id, '2026-10-10T14:11:50Z', 2, 'blocked'],
      [C63AC.id, '2026-10-10T09:55:20Z', 5, 'no-owner'],
    ]);
  });
  it('earlier notices newest first', () => {
    expect(groups[2]!.earlier.map((n) => n.createdAt)).toEqual(['2026-10-09T14:11:50Z', '2026-10-08T14:11:46Z']);
  });
  it('the unclaimed card has no face', () => expect(groups[3]!.agentName).toBeNull());
  it('read notices only when asked for', () => {
    const read = DX_NOTIFICATIONS.map((n) => (n.cardId === C63AC.id ? { ...n, read: true } : n));
    expect(activityGroups(read, false, rows, DX_BOARD, DX_AGENTS)).toHaveLength(3);
    expect(activityGroups(read, true, rows, DX_BOARD, DX_AGENTS)).toHaveLength(4);
  });
});

describe('runningRows and spendView', () => {
  it('nothing runs on the fixture board', () => expect(runningRows(DX_BOARD, DX_AGENTS)).toEqual([]));
  it('a working card is a running row', () => {
    const board = { ...DX_BOARD, cards: [{ ...C58F8, state: 'working', delegateAgentId: 'agt_fx_tester_tim', costUsd: 0.42 }] };
    expect(runningRows(board, DX_AGENTS)).toEqual([{ cardId: C58F8.id, title: C58F8.title, boardId: DX_BOARD.boardId, boardName: DX_BOARD.name, stageName: 'Failing test', agentName: 'tester-tim', iconUrl: null, costUsd: 0.42, since: C58F8.stateSince ?? null }]);
  });
  it('spend with no usage, no cap', () => {
    expect(spendView(null, DX_BOARD.usage, DX_AGENTS)).toEqual({ total: 0, cap: null, cardCap: null, overBudget: false, pct: null, top: [], more: 0 });
  });
  it('spend against a cap, top agents by name', () => {
    const usage = { totalCostUsd: 5, estimatedCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, unpricedRecords: 0, byModel: [], byCard: [], byAgent: [{ agentId: 'agt_fx_tester_tim', costUsd: 1 }, { agentId: 'agt_fx_coder_kai', costUsd: 4 }], byDay: [] };
    expect(spendView(usage, { ...DX_BOARD.usage, budgetUsd: 20 }, DX_AGENTS)).toMatchObject({ total: 5, cap: 20, pct: 25, top: [{ name: 'coder-kai', costUsd: 4 }, { name: 'tester-tim', costUsd: 1 }] });
  });
  it('names five who spent most and counts the rest, never dropping them silently', () => {
    const byAgent = Array.from({ length: 8 }, (_, i) => ({ agentId: `agt_${i}`, costUsd: i + 1 }));
    const usage = { totalCostUsd: 36, estimatedCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, unpricedRecords: 0, byModel: [], byCard: [], byAgent, byDay: [] };
    const v = spendView(usage, null, []);
    expect(v.top).toHaveLength(5);
    expect(v.more).toBe(3);
  });
});

describe('moveTargets and parseCap', () => {
  it('stages an agent works, without the current one (OP-G6)', () => {
    expect(moveTargets(DX_BOARD.stages, 'reported').map((s) => s.name)).toEqual(['Reproduce', 'Failing test', 'Fix', 'Integrate']);
  });
  it('a blank cap clears it; dollars parse; anything else is refused', () => {
    expect(parseCap('')).toEqual({ ok: true, value: null });
    expect(parseCap(' 25.50 ')).toEqual({ ok: true, value: 25.5 });
    expect(parseCap('-1')).toEqual({ ok: false, error: 'Enter an amount in dollars, like 25 or 25.50.' });
    expect(parseCap('lots')).toEqual({ ok: false, error: 'Enter an amount in dollars, like 25 or 25.50.' });
  });
});

describe('an agent the workspace cannot name (rule 5: names, never ids)', () => {
  const GHOST = 'agt_2613e473e3934509';
  it('Needs, Running and Activity rows carry no name, so their words say "An agent"; Spend says it too', () => {
    const board = { ...DX_BOARD, cards: DX_BOARD.cards.map((c) => ({ ...c, delegateAgentId: GHOST, lastAgentId: GHOST })) };
    const need = needRows(board, DX_AGENTS, sortAttention(itemsFromBoard(board, DX_AGENTS, DX_NOW), 'stage'), DX_NOW);
    expect(need.length).toBeGreaterThan(0);
    for (const r of need) expect(r.agentName).toBeNull();
    for (const g of activityGroups(DX_NOTIFICATIONS, true, need, board, DX_AGENTS)) expect(g.agentName).toBeNull();
    const running = runningRows({ ...board, cards: board.cards.map((c) => ({ ...c, state: 'working' as const })) }, DX_AGENTS);
    expect(running.length).toBeGreaterThan(0);
    for (const r of running) expect(r.agentName).toBeNull();
    const usage = { totalCostUsd: 1, estimatedCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, unpricedRecords: 0, byModel: [], byCard: [], byAgent: [{ agentId: GHOST, costUsd: 1 }], byDay: [] };
    expect(spendView(usage, null, DX_AGENTS).top).toEqual([{ id: GHOST, name: 'An agent', costUsd: 1 }]);
    // Two such agents are two rows (their key is the id, not the words).
    const two = spendView({ ...usage, byAgent: [{ agentId: GHOST, costUsd: 1 }, { agentId: 'agt_ffffffffffff0001', costUsd: 2 }] }, null, DX_AGENTS).top;
    expect(new Set(two.map((a) => a.id)).size).toBe(2);
    expect(JSON.stringify([need.map((r) => r.agentName), running])).not.toMatch(/agt_…|…934509/);
  });
});

describe('rows carry their board (the Inbox spans boards)', () => {
  it('every Needs, Running and Activity row names its board', () => {
    expect(new Set(rows.map((r) => [r.boardId, r.boardName].join('|')))).toEqual(new Set([`${DX_BOARD.boardId}|${DX_BOARD.name}`]));
    expect(rows[0]!.stages.map((s) => s.key)).toEqual([...DX_BOARD.stages].sort((a, b) => a.order - b.order).map((s) => s.key));
    for (const g of activityGroups(DX_NOTIFICATIONS, true, rows, DX_BOARD, DX_AGENTS)) expect(g.boardId).toBe(DX_BOARD.boardId);
    for (const r of runningRows({ ...DX_BOARD, cards: DX_BOARD.cards.map((c) => ({ ...c, state: 'working' })) }, DX_AGENTS)) expect(r.boardName).toBe(DX_BOARD.name);
  });
  it('spend over several boards adds the totals and each agent across them', () => {
    const u = (total: number, byAgent: Array<{ agentId: string; costUsd: number }>) => ({ totalCostUsd: total, estimatedCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, unpricedRecords: 0, byModel: [], byAgent, byCard: [], byDay: [] });
    const m = mergeUsage([u(1.5, [{ agentId: 'a', costUsd: 1 }, { agentId: 'b', costUsd: 0.5 }]), u(2, [{ agentId: 'a', costUsd: 2 }])]);
    expect(m?.totalCostUsd).toBe(3.5);
    expect(m?.byAgent).toEqual([{ agentId: 'a', costUsd: 3 }, { agentId: 'b', costUsd: 0.5 }]);
    expect(mergeUsage([])).toBeNull();
  });
});
