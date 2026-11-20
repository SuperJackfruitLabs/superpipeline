// apps/web/src/lib/components/inbox/inbox-ui.svelte.test.ts
import { describe, expect, it, vi } from 'vitest';
import { itemsFromBoard } from '$lib/components/attention/attention';
import { realisticWorkspace, REALISTIC_NOW_MS } from '$lib/fixtures/realistic';
import { needRows } from '../operate/operate-data';
import type { NeedRow } from '../operate/operate-types';
import { InboxUi } from './inbox-ui.svelte';
import { MOVE_FAILED } from './inbox-words';

const world = realisticWorkspace();
const planning = world.boards[0];
/** Planning & Roadmap's unclaimed cards in Idea: each can move to Shape. */
const unclaimed: NeedRow[] = needRows(planning, world.agents, itemsFromBoard(planning, world.agents, REALISTIC_NOW_MS), REALISTIC_NOW_MS)
  .filter((r) => r.item.kind === 'no-owner');

describe('Move all', () => {
  it('moves every card to its board’s stage of that name', async () => {
    const move = vi.fn<(row: NeedRow, key: string) => Promise<string | null>>().mockResolvedValue(null);
    const ui = new InboxUi(() => ({ move, resume: vi.fn<() => Promise<string | null>>() }));
    await ui.moveAll(unclaimed, 'Shape');
    expect(move).toHaveBeenCalledTimes(unclaimed.length);
    expect(move.mock.calls.every(([, key]) => key === 'shape')).toBe(true);
    expect(ui.moveAllNote).toBeNull();
  });
  it('stops at the first failure and says how many moved', async () => {
    expect(unclaimed.length).toBeGreaterThan(3);
    const move = vi.fn<(row: NeedRow, key: string) => Promise<string | null>>()
      .mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('network'));
    const ui = new InboxUi(() => ({ move, resume: vi.fn<() => Promise<string | null>>() }));
    await ui.moveAll(unclaimed, 'Shape');
    expect(move).toHaveBeenCalledTimes(3);
    expect(ui.moveAllNote).toBe(`Moved 2 of ${unclaimed.length}; the rest did not move: ${MOVE_FAILED}`);
  });
  it('a refusal stops it too, in the server’s words', async () => {
    const move = vi.fn<(row: NeedRow, key: string) => Promise<string | null>>().mockResolvedValueOnce('The stage is closed.');
    const ui = new InboxUi(() => ({ move, resume: vi.fn<() => Promise<string | null>>() }));
    await ui.moveAll(unclaimed, 'Shape');
    expect(move).toHaveBeenCalledTimes(1);
    expect(ui.moveAllNote).toBe(`Moved 0 of ${unclaimed.length}; the rest did not move: The stage is closed.`);
  });
});
