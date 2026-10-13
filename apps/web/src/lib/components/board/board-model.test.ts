// apps/web/src/lib/components/board/board-model.test.ts
import { describe, expect, it } from 'vitest';
import { DX, DX_IDS, ONBOARDING, RELEASES, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel, orderForBoard } from './board-model';

const dx = () => buildBoardModel(DX, DX.cards, boardCtx());
const short = (id: string) => id.slice(-4);

describe('orderForBoard (plan ruling X-1: needs first, then createdAt ascending)', () => {
  it('reads 63ac, 58f8, 1dfc, 4605, then f83f, 481f, then 9ed9 on Developer Experience', () => {
    expect(dx().ordered.map((s) => short(s.id))).toEqual(['63ac', '58f8', '1dfc', '4605', 'f83f', '481f', '9ed9']);
  });
  it('is a pure function of urgency and createdAt, whatever order the API sent', () => {
    const m = dx();
    expect(orderForBoard([...m.cards].reverse()).map((s) => s.id)).toEqual(m.ordered.map((s) => s.id));
  });
});

describe('buildBoardModel on Developer Experience', () => {
  it('never shows an archived card', () => {
    const m = dx();
    expect(m.cards).toHaveLength(7);
    expect(m.cards.some((s) => s.title.startsWith('Scratch'))).toBe(false);
  });
  it('counts', () => {
    expect(dx().counts).toEqual({ all: 7, needs: 4, working: 0, queued: 2, queuedBlocked: 2, done: 1, closed: 0, overdue: 1, overBudget: 0, blocked: 2 });
  });
  it('numbers footnotes: one per needs card, one per shared group, spend last', () => {
    const m = dx();
    expect(m.ordered.map((s) => s.fnNumber)).toEqual([1, 2, 3, 4, 5, 5, 6]);
    expect(m.ordered.map((s) => s.ix)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(m.fn.spend).toBe(7);
  });
  it('holders are the agents of the needs cards, in board order', () => {
    expect(dx().holders.map((a) => a.name)).toEqual(['tester-tim', 'coder-kai', 'error-eric']);
  });
  it('stages carry the owner labels and one unit per card, needs then blocked', () => {
    const m = dx();
    expect(m.stages.map((s) => s.ownerLong)).toEqual(['a person', 'diagnostics · error-eric', 'testing · tester-tim', 'code · 2 agents', 'integration or api or testing · 3 agents', 'a person · approval', 'a person']);
    expect(m.stages.map((s) => s.ownerShort)).toEqual(['a person', 'diagnostics · error-eric', 'testing · tester-tim', 'code · 2 agents', 'integration', 'gate · approval by a person', 'a person']);
    expect(m.stages.map((s) => s.count)).toEqual([1, 1, 3, 1, 0, 0, 1]);
    expect(m.stages[2]!.units).toEqual(['needs', 'blocked', 'blocked']);
    expect(m.stages[6]!.units).toEqual(['done']);
    expect(m.stages.map((s) => s.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(m.stages.map((s) => s.terminal)).toEqual([false, false, false, false, false, false, true]);
  });
  it('carries the attention rows and the week’s spend', () => {
    const m = dx();
    expect(m.attention.map((a) => a.kind)).toEqual(['no-owner', 'blocked', 'blocked', 'blocked']);
    expect(m.spend7d).toBe(0);
    expect(m.nowMs).toBe(Date.parse('2026-10-11T08:21:00Z'));
    expect(m.stageDefs.map((s) => s.key)).toEqual(['reported', 'reproduce', 'test', 'fix', 'integrate', 'signed-off', 'shipped']);
  });
});

describe('the new CardSummary fields', () => {
  const by = (id: string) => dx().cards.find((s) => s.id === id)!;
  it('63ac: mine, unowned stage, overdue, three labels and one dangling', () => {
    const s = by(DX_IDS.c63ac);
    expect(s).toMatchObject({ ageShort: '2d', ageLong: '2 days', agoWords: '2 days ago', kind: 'no-owner', labelsAll: 4, moreLabels: 1, lastAgent: null, overdue: true, terminal: false });
    expect(s.labels.map((l) => l.name)).toEqual(['clean-room', 'evidence-required', 'superpipeline']);
    expect(s.owner).toEqual({ id: 'usr_b19776fac3c94df4', name: 'Rakesh Gangwar', initials: 'RG', isMe: true });
    expect(s.stopReason).toBe('No agent works this stage and no review is asked for here, so it will sit forever. Move it to a stage someone works.');
    expect(s.queuedBy?.name).toBe('super-chotu');
  });
  it('58f8: stopped, its agent, the summary and the detail verbatim', () => {
    const s = by(DX_IDS.c58f8);
    expect(s).toMatchObject({ ageShort: '33h', ageLong: '33 hours', agoWords: '33 hours ago', kind: 'blocked', summaryLine: 'Needs a writable Forge URL for agentpod.' });
    expect(s.lastAgent).toEqual({ id: 'agt_fx_tester_tim', name: 'tester-tim', iconUrl: null });
    expect(s.stopReason).toContain("grant Tester Tim's station write access.");
    expect(s.firstRef?.title).toBe('Deterministic X publisher red-test evidence');
  });
  it('4605 and 9ed9 ages', () => {
    expect(by(DX_IDS.c4605)).toMatchObject({ ageShort: '2d', ageLong: '2 days', agoWords: '2 days ago' });
    expect(by(DX_IDS.c9ed9)).toMatchObject({ ageShort: '1d', agoWords: 'yesterday', terminal: true, urgency: 'done' });
    expect(by(DX_IDS.c481f)).toMatchObject({ ageShort: '33h', urgency: 'queued' });
  });
});

describe('buildBoardModel on the other fixture boards', () => {
  it('Agent Onboarding: 20 done cards and the Proving owner', () => {
    const m = buildBoardModel(ONBOARDING, ONBOARDING.cards, boardCtx());
    expect(m.counts).toMatchObject({ all: 20, needs: 0, done: 20 });
    expect(m.stages.map((s) => s.ownerLong)).toEqual(['a person', 'onboarding · onboarding-olivia', 'onboarding · onboarding-olivia', 'design · artistic-lyra', 'a person · approval', 'claim-check or analysis · 2 agents', 'a person · approval']);
    expect(m.holders).toEqual([]);
  });
  it('Production Releases: no cards, five stages', () => {
    const m = buildBoardModel(RELEASES, RELEASES.cards, boardCtx());
    expect(m.counts.all).toBe(0);
    expect(m.stages.map((s) => s.ownerLong)).toEqual(['a person', 'release · devops-dave', 'security-review · vulnerability-victor', 'a person · approval', 'a person']);
  });
});

describe('an agent that no longer exists', () => {
  it('is "an agent" on the card, with no throw, and is not a crew member', () => {
    const gone = { ...DX, cards: DX.cards.map((c) => (c.id === DX_IDS.c58f8 ? { ...c, lastAgentId: 'agt_gone' } : c)) };
    const m = buildBoardModel(gone, gone.cards, boardCtx());
    const s = m.cards.find((c) => c.id === DX_IDS.c58f8)!;
    expect(s.lastAgent).toEqual({ id: 'agt_gone', name: 'an agent', iconUrl: null });
  });

  it('a done card that still carries a blocker is not counted as blocked, in the model or its stage', () => {
    const onb = buildBoardModel(ONBOARDING, ONBOARDING.cards, boardCtx());
    expect(onb.cards.filter((s) => s.blocked && s.urgency === 'done').length).toBeGreaterThan(0);
    expect(onb.counts.blocked).toBe(0);
    expect(onb.stages.every((st) => st.blocked === 0)).toBe(true);
  });
});
