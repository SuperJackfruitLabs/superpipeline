// apps/web/src/lib/components/board/board-track.svelte.test.ts
// @vitest-environment jsdom
/**
 * The track's cells are drop targets (a card can go to a stage with no lane). vibekit draws a new
 * form of the track per vibe, which makes new cells: the drop targets must follow (M2).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import type { Vibe } from '@superjackfruitlabs/vibekit-ui';

type DropParams = { stageKey: string; onDrop: (cardId: string) => void };
const { drops, target } = vi.hoisted(() => {
  const recs: Array<{ node: HTMLElement; params: DropParams }> = [];
  const make = () => (node: HTMLElement, params: DropParams) => {
    const rec = { node, params };
    recs.push(rec);
    return { update(next: DropParams) { rec.params = next; }, destroy() { recs.splice(recs.indexOf(rec), 1); } };
  };
  return { drops: recs, target: make };
});
vi.mock('$lib/dnd', () => ({ cardDraggable: () => ({ update() {}, destroy() {} }), columnDropTarget: target(), trackCellDropTarget: target() }));

import { app } from '$lib/stores/app.svelte';
import VibeFrame from '$lib/composition/VibeFrame.svelte';
import BoardTrack from './BoardTrack.svelte';

const keys = ['reported', 'fix', 'shipped'];
const names = ['Reported', 'Fix', 'Shipped'];
const details = names.map(() => ({ count: 0 }));
let stop: (() => void) | null = null;
afterEach(() => { stop?.(); stop = null; });

describe('BoardTrack', () => {
  it('after a vibe change every cell on screen is still a drop target for its stage', async () => {
    const moveCard = vi.spyOn(app, 'moveCard').mockImplementation(async () => {});
    const container = document.body.appendChild(document.createElement('div'));
    const p = $state<{ vibe: Vibe; component: typeof BoardTrack; props: { keys: string[]; names: string[]; details: Array<{ count: number }> } }>({ vibe: 'daylight', component: BoardTrack, props: { keys, names, details } });
    // VibeFrame is generic over its component's props; the test hands it one, held as state so the vibe can change.
    const frame = mount(VibeFrame, { target: container, props: p as never });
    stop = () => { void unmount(frame); container.remove(); };
    flushSync();
    const cells = () => [...container.querySelectorAll<HTMLElement>('li.vk-stages__step')];
    expect(cells()).toHaveLength(3);
    for (const vibe of ['paper', 'studio', 'quiet', 'daylight'] as const) {
      const before = cells();
      p.vibe = vibe;
      flushSync();
      await tick();
      const now = cells();
      expect(now, `${vibe}: three cells`).toHaveLength(3);
      // The vibe drew its own cells (the old ones are gone), and each new one is its stage's target.
      expect(now.some((li, i) => li !== before[i]), `${vibe} draws new cells`).toBe(true);
      expect(drops.map((d) => d.node), `${vibe}: the targets are the cells on screen`).toEqual(now);
      expect(drops.map((d) => d.params.stageKey), `${vibe}: each for its stage`).toEqual(keys);
    }
    drops.find((d) => d.params.stageKey === 'fix')!.params.onDrop('card_y');
    expect(moveCard).toHaveBeenCalledWith('card_y', 'fix');
  });
});
