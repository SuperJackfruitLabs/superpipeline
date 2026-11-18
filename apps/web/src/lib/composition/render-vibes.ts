/**
 * Render one component in all four vibes, for parity and guard tests (jsdom or a browser).
 * Each copy mounts inside its own element-scoped `VibeRoot`, so the component reads its vibe from
 * context exactly as it does in the app, and the root carries `data-motion="reduce"` so nothing animates.
 */
import { flushSync, mount, tick, type Component, type Snippet } from 'svelte';
import { VibeRoot, type Vibe } from '@superjackfruitlabs/vibekit-ui';

/**
 * A snippet is called with its anchor node, and a compiled component is called the same way
 * (anchor first, props second: `Component`'s first parameter). So `(anchor) => C(anchor, props)` is
 * what `{#snippet children()}<C {...props} />{/snippet}` compiles to, written without a wrapper
 * .svelte file. `Snippet`'s return type is branded, so a hand-written one needs this overload to type.
 */
function asSnippet(render: (anchor: never) => void): Snippet;
function asSnippet(render: unknown): unknown {
  return render;
}

function mountIn<P extends Record<string, unknown>>(vibe: Vibe, C: Component<P>, props: P): Element {
  const host = document.createElement('div');
  document.body.append(host);
  const children = asSnippet((anchor) => { C(anchor, props); });
  mount(VibeRoot, { target: host, props: { vibe, theme: 'light', scope: 'element', children } });
  flushSync();
  const root = host.querySelector('.vk-viberoot');
  if (!root) throw new Error(`VibeRoot drew no root for ${vibe}`);
  root.setAttribute('data-motion', 'reduce');
  return root;
}

/** One root per vibe (the `.vk-viberoot` element, `data-vibe` set), each attached to `document.body`. Remove them when done. */
export async function renderInVibes<P extends Record<string, unknown>>(C: Component<P>, props: P): Promise<Record<Vibe, Element>> {
  const roots: Record<Vibe, Element> = {
    daylight: mountIn('daylight', C, props),
    paper: mountIn('paper', C, props),
    studio: mountIn('studio', C, props),
    quiet: mountIn('quiet', C, props),
  };
  await tick();
  return roots;
}
