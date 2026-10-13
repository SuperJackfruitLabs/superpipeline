// apps/web/src/lib/components/dialogs/palette-index.test.ts
import { describe, expect, it } from 'vitest';
import { AGENTS, BOARDS, DX_STAGES, PR_STAGES } from '../../../../e2e/pixel/fixture/dialog-cases';
import { switcherOrder } from './switcher-model';
import { buildPaletteIndex, filterPalette, groupCount, paletteCount, soleOwnerOrder, splitMark, type PaletteCtx } from './palette-index';

const DX = 'brd_134a0ddb6d434478';
const summary = (id: string, title: string, stageName: string, o: Record<string, unknown> = {}) =>
  ({ id, title, stageName, lead: { kind: 'idle' }, ageHours: null, blocked: null, urgency: 'queued', ...o }) as never;
/** DX in groupByUrgency order (needs first, then queued, done). */
const CARDS = [
  summary('card_fx_dx_63ac', 'Fix the highest-severity blocker found in the clean-room journey', 'Reported', { urgency: 'needs' }),
  summary('card_9ac2116a050858f8', 'AgentPod: connector interface and generic effects ledger, state machine and executor', 'Failing test', { urgency: 'needs', lead: { kind: 'stopped' }, ageHours: 33.2 }),
  summary('card_fx_dx_1dfc', 'Superpipeline: manual-delivery completion and approval-subject hardening', 'Fix', { urgency: 'needs', lead: { kind: 'stopped' }, ageHours: 33.2 }),
  summary('card_05823a57e8224605', 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop', 'Reproduce', { urgency: 'needs', lead: { kind: 'stopped' }, ageHours: 62.4 }),
  summary('card_fx_dx_f83f', 'Integrate editorial workflows and prove no-write publishing acceptance', 'Failing test', { blocked: { kind: 'enforced' } }),
  summary('card_fx_dx_481f', 'agentpod-connectors: X connector (connector x)', 'Failing test', { blocked: { kind: 'enforced' } }),
  summary('card_fx_dx_9ed9', 'Build immutable approval subjects and digest-bound gates', 'Shipped', { urgency: 'done' }),
];
const ctx: PaletteCtx = {
  board: { id: DX, name: 'Developer Experience' }, cards: CARDS, boards: switcherOrder(BOARDS, DX), currentBoardId: DX,
  agents: AGENTS, theme: 'light', personName: 'Ira Mehta',
};
const sole = soleOwnerOrder([{ stages: DX_STAGES }, { stages: PR_STAGES }], AGENTS);

describe('palette index', () => {
  it('ranks agents that alone own a stage: this board first, then the empty boards', () => {
    expect(sole.map((id) => AGENTS.find((a) => a.id === id)!.name)).toEqual(['error-eric', 'tester-tim', 'devops-dave', 'vulnerability-victor']);
  });
  it('“agent” matches exactly the reference’s eight rows', () => {
    const r = filterPalette(buildPaletteIndex(ctx), 'agent', sole);
    expect(r.total).toBe(8);
    expect(paletteCount(r.total, 'agent', 'Developer Experience')).toBe('8 matches for “agent”');
    expect(r.groups.map((g) => [g.group, groupCount(g.items.length)])).toEqual([
      ['Cards', '2 results'], ['Boards', '1 result'], ['Agents', '4 results'], ['Actions', '1 result'],
    ]);
    expect(r.groups[0]!.items.map((i) => [i.sub, i.meta, i.needs])).toEqual([
      ['Developer Experience · Failing test · stopped 33h', '#58f8', true],
      ['Developer Experience · Failing test · Blocked', '#481f', false],
    ]);
    expect(r.groups[1]!.items.map((i) => [i.label, i.sub])).toEqual([['Agent Onboarding', '20 cards']]);
    expect(r.groups[2]!.items.map((i) => [i.label, i.sub])).toEqual([
      ['error-eric', 'diagnostics'], ['tester-tim', 'testing'], ['devops-dave', 'release'], ['vulnerability-victor', 'security-review'],
    ]);
    expect(r.groups[3]!.items.map((i) => [i.label, i.sub, i.verb])).toEqual([['Workspace', 'agents, capabilities, labels and people', 'Go']]);
    expect(r.flat[0]!.verb).toBe('Open card');
  });
  it('writes card and board subs as the reference does', () => {
    const items = buildPaletteIndex(ctx);
    expect(items.find((i) => i.meta === '#4605')!.sub).toBe('Developer Experience · Reproduce · stopped 2d');
    expect(items.find((i) => i.meta === '#9ed9')!.sub).toBe('Developer Experience · Shipped · Done');
    const board = (name: string) => items.find((i) => i.group === 'Boards' && i.label === name)!.sub;
    expect(board('Developer Experience')).toBe('You are here · 7 cards · 4 need you');
    expect(board('Research & Intelligence')).toBe('1 card · 1 needs you');
    expect(board('Production Releases')).toBe('No cards yet');
  });
  it('offers the account commands, and the opposite theme', () => {
    const acc = buildPaletteIndex(ctx).filter((i) => i.group === 'Account');
    expect(acc.map((i) => [i.label, i.sub, i.verb])).toEqual([
      ['Appearance…', 'vibe, light or dark, time of day', 'Open'], ['Dark theme', 'theme', 'Switch'], ['Sign out', 'Ira Mehta', 'Sign out'],
    ]);
    expect(buildPaletteIndex({ ...ctx, theme: 'dark' }).find((i) => i.group === 'Account' && i.verb === 'Switch')!.label).toBe('Light theme');
  });
  it('without a board it says so and drops the board-bound actions', () => {
    const items = buildPaletteIndex({ ...ctx, board: null, cards: [], currentBoardId: null });
    expect(items.filter((i) => i.group === 'Actions').map((i) => i.label)).toEqual(['Workspace']);
    expect(paletteCount(items.length, '', null)).toBe('Everything in your workspace: boards, agents and actions');
    expect(paletteCount(items.length, '  ', 'Developer Experience')).toBe('Everything on Developer Experience, plus boards, agents and actions');
    expect(paletteCount(1, 'x', null)).toBe('1 match for “x”');
  });
  it('marks the first hit in a label, and never an empty mark', () => {
    expect(splitMark('AgentPod: connector', 'agent')).toEqual({ pre: '', hit: 'Agent', post: 'Pod: connector' });
    expect(splitMark('agentpod-connectors', 'AGENT')).toEqual({ pre: '', hit: 'agent', post: 'pod-connectors' });
    expect(splitMark('error-eric', 'agent')).toEqual({ pre: 'error-eric', hit: '', post: '' });
  });
});
