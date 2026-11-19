// apps/web/src/lib/components/operate/board-log.svelte.test.ts
// @vitest-environment jsdom
/** The paged board log (rule 7): after the last "Show N more", focus is on the first new row (M6). */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import BoardLog from './BoardLog.svelte';

const settle = async () => { for (let i = 0; i < 4; i++) { await tick(); await new Promise((r) => setTimeout(r, 0)); } };
afterEach(() => cleanup());

describe('BoardLog, paged', () => {
  it('the last "Show N more" leaves focus on the first new row, whether or not it has a card', async () => {
    // Fifteen events, the newest first; the eleventh names no card, so the row itself takes focus.
    const events = Array.from({ length: 15 }, (_, i) => ({ seq: 15 - i, type: i === 10 ? 'board.updated' : 'card.moved', payload: i === 10 ? {} : { cardId: `card_${i}` }, ts: new Date(Date.UTC(2026, 10, 18, 9, 0, 15 - i)).toISOString() }));
    const { container } = render(BoardLog, { props: { events, error: null, collapsedRows: 10, fullLogHref: null, paged: true } });
    const log = () => container.querySelector('ol.log');
    expect(log()?.querySelectorAll('li.lrow')).toHaveLength(10);
    await fireEvent.click(screen.getByRole('button', { name: /^Show 5 more/ }));
    await settle();
    expect(log()?.querySelectorAll('li.lrow')).toHaveLength(15);
    expect(screen.queryByRole('button', { name: /^Show \d+ more/ })).toBeNull();
    expect(document.activeElement).toBe(log()?.querySelectorAll('li.lrow')[10]);
  });
});
