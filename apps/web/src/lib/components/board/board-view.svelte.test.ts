// @vitest-environment jsdom
/**
 * The board page's composition. Characterization first: dropping a card on a stage calls
 * `app.moveCard` with that stage's key. The drag library cannot run in jsdom, so `$lib/dnd` is
 * replaced by recorders that keep each drop target's params; a test drops by calling `onDrop`.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';

const { store, drops } = vi.hoisted(() => ({
  store: { openCard: vi.fn(), moveCard: vi.fn(async () => {}), error: '', openCardId: null },
  drops: [] as Array<{ node: HTMLElement; params: { stageKey: string; onDrop: (cardId: string) => void } }>,
}));
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));
vi.mock('$lib/dnd', () => {
  const target = (node: HTMLElement, params: { stageKey: string; onDrop: (cardId: string) => void }) => {
    const rec = { node, params };
    drops.push(rec);
    return { update(next: typeof params) { rec.params = next; }, destroy() { drops.splice(drops.indexOf(rec), 1); } };
  };
  return { cardDraggable: () => ({ update() {}, destroy() {} }), columnDropTarget: target, trackCellDropTarget: target };
});

import { DX, DX_IDS, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from './board-model';
import BoardDaylight from './layouts/BoardDaylight.svelte';

beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});
afterEach(() => { cleanup(); store.moveCard.mockClear(); });

const model = buildBoardModel(DX, DX.cards, boardCtx());

describe('the board: drag and drop', () => {
  it('moving a card calls app.moveCard with the stage key', () => {
    render(BoardDaylight, { model, vibe: 'daylight', phase: 'noon', onCompose: vi.fn() });
    const fix = drops.find((d) => d.params.stageKey === 'fix');
    expect(fix, 'the Fix lane is a drop target').toBeTruthy();
    fix!.params.onDrop(DX_IDS.c58f8);
    expect(store.moveCard).toHaveBeenCalledWith(DX_IDS.c58f8, 'fix');
  });
});
