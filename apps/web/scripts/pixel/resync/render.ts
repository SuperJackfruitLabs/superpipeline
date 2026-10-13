// apps/web/scripts/pixel/resync/render.ts — SSR one vibekit 0.0.1 component exactly as a product renders it.
//
// Runs the component through Vite's SSR loader with the Svelte plugin (and only it), so it renders the
// server build in vitest and from the plain-node CLI alike. The component sits inside
// <VibeRoot {vibe} {theme} product="superpipeline" scope="element">; the wrapper is removed from the result.
import { fileURLToPath } from 'node:url';
import type { ViteDevServer } from 'vite';

export type Vibe = 'daylight' | 'paper' | 'studio' | 'quiet';
export type Look = { vibe: Vibe; theme: 'light' | 'dark' };
/** A prop whose value is raw HTML becomes a Svelte snippet (children, icon, a frame's body). */
export type Html = { html: string };
export const html = (s: string): Html => ({ html: s });

import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ENTRY = fileURLToPath(new URL('./entry.ts', import.meta.url));
let server: Promise<ViteDevServer> | null = null;

async function vite(): Promise<ViteDevServer> {
  server ??= (async () => {
    const { createServer } = await import('vite');
    const { svelte } = await import('@sveltejs/vite-plugin-svelte');
    return createServer({
      configFile: false,
      root: fileURLToPath(new URL('../../..', import.meta.url)),
      logLevel: 'error',
      appType: 'custom',
      server: { middlewareMode: true, hmr: false, ws: false },
      plugins: [svelte({ compilerOptions: { hmr: false } })],
      // One svelte runtime: Node's own import of it, never pre-bundled or inlined by the module runner. Under
      // load a second copy got evaluated beside the first, and vibekit's setContext then ran against a
      // component stack it could not see (lifecycle_outside_component, about one run in four).
      ssr: { noExternal: ['@superjackfruit/vibekit'], external: ['svelte'], optimizeDeps: { disabled: true } },
      optimizeDeps: { noDiscovery: true, include: [] },
      // Its own pre-bundle cache: sharing node_modules/.vite with the dev server or another run makes one
      // re-optimise under the other ("There is a new version of the pre-bundle", or a full page reload).
      cacheDir: join(tmpdir(), `sp-resync-vite-${process.pid}`),
    });
  })();
  return server;
}

export async function closeRenderer(): Promise<void> {
  if (server) { const s = await server; server = null; await s.close(); }
}

/** Svelte's SSR hydration markers and the VibeRoot wrapper are not part of what a component draws. */
export function stripWrapper(body: string): string {
  const out = body.replace(/<!--[\s\S]*?-->/g, '').trim();
  const m = /^<div class="vk-viberoot"[^>]*>([\s\S]*)<\/div>$/.exec(out);
  if (!m) throw new Error(`render: no VibeRoot wrapper in ${out.slice(0, 120)}`);
  return trimLabels(m[1]!.trim());
}

/**
 * Svelte's SSR keeps the template's line breaks as one space before a label ("> Dispatch"). A label
 * reads from its tag: drop whitespace that opens an element's text, and the gap after an icon slot.
 */
export function trimLabels(h: string): string {
  return h.replace(/(<[a-zA-Z][^<>]*>)\s+(?=[^\s<])/g, '$1').replace(/(<\/svg><\/span>)\s+(?=[^\s<])/g, '$1');
}

export async function renderComponent(name: string, props: Record<string, unknown>, look: Look): Promise<string> {
  const s = await vite();
  const mod = (await s.ssrLoadModule(ENTRY)) as { renderInRoot: (n: string, p: Record<string, unknown>, l: Look) => string };
  return stripWrapper(mod.renderInRoot(name, props, look));
}
