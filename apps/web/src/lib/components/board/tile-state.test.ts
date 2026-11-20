import { describe, expect, it } from 'vitest';
import { DX, DX_IDS, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from './board-model';
import { stateLine } from './tile-state';

const m = buildBoardModel(DX, DX.cards, boardCtx());
const by = (id: string) => m.cards.find((s) => s.id === id)!;

describe('a tile’s one state line', () => {
  it('says who holds the card and what it means for you; needs is set only when it waits on a person', () => {
    expect(stateLine(by(DX_IDS.c63ac))).toEqual({ text: 'With you · no agent works this stage · overdue since 6 Oct', needs: true });
    expect(stateLine(by(DX_IDS.c4605))).toEqual({ text: 'error-eric · needs you', needs: true });
    expect(stateLine(by(DX_IDS.cf83f))).toEqual({ text: 'Unclaimed · starts when unblocked', needs: false });
  });
  it('a finished card names what it produced', () => {
    expect(stateLine(by(DX_IDS.c9ed9))).toEqual({ text: 'Shipped · test(api): pin immutable approval subject binding', needs: false });
  });
});
