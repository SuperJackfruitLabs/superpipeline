// apps/web/src/lib/components/dialogs/switcher-model.test.ts
import { describe, expect, it } from 'vitest';
import { BOARDS } from '../../../../e2e/pixel/fixture/dialog-cases';
import { boardCountText, groupBoards, needsChip, switcherOrder } from './switcher-model';

const DX = 'brd_134a0ddb6d434478';

describe('board switcher model', () => {
  it('puts boards that need you first (this one first), then the rest by last use', () => {
    const g = groupBoards(BOARDS, DX, '');
    expect(g.map((x) => [x.label, x.right])).toEqual([['Needs you', '7 cards'], ['Everything else, last used first', '8 boards']]);
    expect(g[0]!.boards.map((b) => b.name)).toEqual(['Developer Experience', 'Research & Intelligence', 'Client Quality', 'Guild Operations & Automation']);
    expect(g[1]!.boards.map((b) => b.name)).toEqual([
      'Agent Onboarding', 'Editorial & Fact-Checking', 'Recurring Maintenance', 'Planning & Roadmap', 'Production Releases',
      'Reliability & Incident Response', 'Marketing & Community', 'superwitness canary',
    ]);
  });
  it('filters by name and renames the second group', () => {
    const g = groupBoards(BOARDS, DX, 're');
    expect(g.map((x) => x.label)).toEqual(['Needs you', 'Other boards']);
    expect(g[1]!.boards.map((b) => b.name)).toEqual(['Recurring Maintenance', 'Production Releases', 'Reliability & Incident Response']);
    expect(groupBoards(BOARDS, DX, 'zzz')).toEqual([]);
  });
  it('flattens to the one order the palette also uses', () => {
    expect(switcherOrder(BOARDS, DX).map((b) => b.id).slice(0, 5)).toEqual([DX, 'brd_fa33a0a0721d4d18', 'brd_6c298ec02d6b466b', 'brd_af3fde184dd84d90', 'brd_f47143722126442c']);
  });
  it('words a board’s counts', () => {
    expect([0, 1, 20].map(boardCountText)).toEqual(['No cards yet', '1 card', '20 cards']);
    expect([1, 4].map(needsChip)).toEqual(['1 needs you', '4 need you']);
  });
});
