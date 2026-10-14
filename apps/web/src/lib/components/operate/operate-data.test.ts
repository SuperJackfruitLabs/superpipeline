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
    expect(runningRows(board, DX_AGENTS)).toEqual([{ cardId: C58F8.id, title: C58F8.title, boardId: DX_BOARD.boardId, boardName: DX_BOARD.name, stageName: 'Failing test', agentName: 'tester-tim', iconUrl: null, costUsd: 0.42 }]);
  });
  it('spend with no usage, no cap', () => {
    expect(spendView(null, DX_BOARD.usage, DX_AGENTS)).toEqual({ total: 0, cap: null, cardCap: null, overBudget: false, pct: null, top: [] });
  });
  it('spend against a cap, top agents by name', () => {
    const usage = { totalCostUsd: 5, estimatedCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0, unpricedRecords: 0, byModel: [], byCard: [], byAgent: [{ agentId: 'agt_fx_tester_tim', costUsd: 1 }, { agentId: 'agt_fx_coder_kai', costUsd: 4 }], byDay: [] };
    expect(spendView(usage, { ...DX_BOARD.usage, budgetUsd: 20 }, DX_AGENTS)).toMatchObject({ total: 5, cap: 20, pct: 25, top: [{ name: 'coder-kai', costUsd: 4 }, { name: 'tester-tim', costUsd: 1 }] });
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
