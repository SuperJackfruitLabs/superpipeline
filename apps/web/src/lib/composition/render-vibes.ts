/**
 * Render one component in every vibe, for parity and guard tests (jsdom or a browser).
 * Each copy mounts `VibeFrame` (an element-scoped `VibeRoot` around the component) in its own
 * container on `document.body`, and its vibe root carries `data-motion="reduce"` so nothing animates.
 */
import { flushSync, mount, tick, unmount, type Component } from 'svelte';
import type { Vibe } from '@superjackfruitlabs/vibekit-ui';
import VibeFrame from './VibeFrame.svelte';

/** The vibe roots, one per vibe (each the `.vk-viberoot` element, `data-vibe` set), plus `unmount()`. */
export type VibeRoots = Record<Vibe, Element> & {
  /** Unmounts every copy and removes their containers. Call it when the test is done. Not enumerable. */
  readonly unmount: () => void;
};


/**
 * Mounts `C` with `props` once per vibe and returns the vibe roots. The result's keys are the
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
  const cleanup = () => {
    for (const { host, app } of handles.splice(0)) {
      void unmount(app);
      host.remove();
    }
  };
  // Typed per vibe, in VIBES order, so a new vibe fails the typecheck here until it is mounted too.
  const roots: VibeRoots = { daylight: mountIn('daylight'), paper: mountIn('paper'), studio: mountIn('studio'), quiet: mountIn('quiet'), console: mountIn('console'), unmount: cleanup };
  // Keys stay the vibes, so callers can iterate the roots.
  Object.defineProperty(roots, 'unmount', { enumerable: false });
  await tick();
  return roots;
}
