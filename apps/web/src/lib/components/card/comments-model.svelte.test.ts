// @vitest-environment jsdom
// apps/web/src/lib/components/card/comments-model.svelte.test.ts
import { describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { CommentsModel } from './comments-model.svelte';

const getComments = vi.hoisted(() => vi.fn(async () => [] as unknown[]));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), getComments }));

describe('CommentsModel', () => {
  it('loads on attach, says how many, and stops listening on cleanup', async () => {
    const stopFeed = vi.fn();
    const onFeed = vi.fn(() => stopFeed);
    let m!: CommentsModel;
    const stop = $effect.root(() => {
      m = new CommentsModel(() => ({ boardId: 'brd_1', cardId: 'card_1', onFeed }));
      $effect(() => m.attach());
    });
    flushSync();
    await vi.waitFor(() => expect(m.loaded).toBe(true));
    expect(getComments).toHaveBeenCalledWith('brd_1', 'card_1');
    expect(m.summary).toBe('No comments yet');
    stop();
    expect(stopFeed).toHaveBeenCalled();
  });
  it('does nothing until attached', () => {
    getComments.mockClear();
    const stop = $effect.root(() => { new CommentsModel(() => ({ boardId: 'brd_1', cardId: 'card_1', onFeed: () => () => {} })); });
    flushSync();
    expect(getComments).not.toHaveBeenCalled();
    stop();
  });
});
