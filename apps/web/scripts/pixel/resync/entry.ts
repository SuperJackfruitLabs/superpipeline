// apps/web/scripts/pixel/resync/entry.ts — loaded by render.ts through Vite SSR; never imported directly.
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import * as vk from '@superjackfruit/vibekit';
import Root from './Root.svelte';

type Look = { vibe: string; theme: string };
const isHtml = (v: unknown): v is { html: string } => !!v && typeof v === 'object' && 'html' in (v as object) && Object.keys(v as object).length === 1;
const snip = (h: string) => createRawSnippet(() => ({ render: () => h }));

/** Raw-HTML props become snippets, and so does a plain-text `children`. */
function toSnippets(v: unknown): unknown {
  if (isHtml(v)) return snip(v.html);
  if (Array.isArray(v)) return v.map(toSnippets);
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toSnippets(x)]));
  return v;
}

export function renderInRoot(name: string, props: Record<string, unknown>, look: Look): string {
  const Component = (vk as Record<string, unknown>)[name];
  if (!Component) throw new Error(`vibekit has no export ${name}`);
  const p = toSnippets(props) as Record<string, unknown>;
  if (typeof p.children === 'string') p.children = snip(p.children);
  return render(Root, { props: { look, Component, props: p } }).body;
}
