import { describe, expect, it } from 'vitest';
import { DX, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from './board-model';
import { boardView, footerLine } from './board-view-model';

const m = buildBoardModel(DX, DX.cards, boardCtx());

describe('the board view model', () => {
  it('the track names every stage with its count, who works it and whether a card there needs you', () => {
    const v = boardView(m);
    expect(v.stageNames).toEqual(['Reported', 'Reproduce', 'Failing test', 'Fix', 'Integrate', 'Signed off', 'Shipped']);
    expect(v.details).toEqual([
      { count: 1, who: 'a person', needs: true },
      { count: 1, who: 'diagnostics · error-eric', needs: true },
      { count: 3, who: 'testing · tester-tim', needs: true },
      { count: 1, who: 'code · 2 agents', needs: true },
      { count: 0, who: 'integration', needs: false },
      { count: 0, who: 'gate · approval by a person', needs: false },
      { count: 1, who: 'a person', needs: false },
    ]);
  });
  it('lanes: only stages that hold cards, and the last stage; needs first inside a lane', () => {
    const v = boardView(m);
    expect(v.lanes.map((l) => `${l.stage.key}:${l.count}`)).toEqual(['reported:1', 'reproduce:1', 'test:3', 'fix:1', 'shipped:1']);
    expect(v.lanes.find((l) => l.stage.key === 'test')!.cards.map((s) => s.urgency)).toEqual(['needs', 'queued', 'queued']);
    expect(v.lanes.every((l) => l.fold === null)).toBe(true);
  });
  it('the last stage gets a lane even when it is empty', () => {
    const none = buildBoardModel(DX, DX.cards.filter((c) => c.currentStageKey !== 'shipped'), boardCtx());
    expect(none.laneStages.map((s) => s.key)).toEqual(['reported', 'reproduce', 'test', 'fix', 'shipped']);
  });
  it('the attention line and the footer', () => {
    expect(boardView(m).attention).toBe('4 cards want you here.');
    expect(footerLine({ items: [{ text: '16 cards' }, { text: '3 need you', signal: true }, { text: 'synced 03:24' }], right: [] })).toBe('16 cards · 3 need you · synced 03:24');
  });
});
