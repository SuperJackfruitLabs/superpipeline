/**
 * Render one component in all four vibes, for parity and guard tests (jsdom or a browser).
 * Each copy mounts `VibeFrame` (an element-scoped `VibeRoot` around the component) in its own
 * container on `document.body`, and its vibe root carries `data-motion="reduce"` so nothing animates.
 */
import { flushSync, mount, tick, unmount, type Component } from 'svelte';
import type { Vibe } from '@superjackfruitlabs/vibekit-ui';
import VibeFrame from './VibeFrame.svelte';

/** The four vibe roots (each the `.vk-viberoot` element, `data-vibe` set), plus `unmount()`. */
export type VibeRoots = Record<Vibe, Element> & {
  /** Unmounts all four copies and removes their containers. Call it when the test is done. Not enumerable. */
  readonly unmount: () => void;
};

const ORDER: readonly Vibe[] = ['daylight', 'paper', 'studio', 'quiet'];

/**
 * Mounts `C` with `props` once per vibe and returns the four vibe roots. The result's keys are the
 * vibes only; `unmount()` sits beside them, not enumerable, and must be called to clean up.
 */
export async function renderInVibes<P extends Record<string, unknown>>(C: Component<P>, props: P): Promise<VibeRoots> {
  const handles: { host: HTMLElement; app: Record<string, unknown> }[] = [];
  const mountIn = (vibe: Vibe): Element => {
    const host = document.createElement('div');
    document.body.append(host);
    const app = mount(VibeFrame<P>, { target: host, props: { vibe, component: C, props } });
    handles.push({ host, app });
    flushSync();
    const root = host.querySelector('.vk-viberoot');
    if (!root) throw new Error(`VibeRoot drew no root for ${vibe}`);
    root.setAttribute('data-motion', 'reduce');
    return root;
  };
  const [daylight, paper, studio, quiet] = ORDER.map(mountIn);
  const cleanup = () => {
    for (const { host, app } of handles.splice(0)) {
      void unmount(app);
      host.remove();
    }
  };
  const roots: VibeRoots = { daylight, paper, studio, quiet, unmount: cleanup };
  // Keys stay the four vibes, so callers can iterate the roots.
  Object.defineProperty(roots, 'unmount', { enumerable: false });
  await tick();
  return roots;
}
