// apps/web/src/lib/components/card/vk-scoped-css.test.ts
/** The swept card stylesheets may place vibekit components (layout only) and never restyle them. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// The guard is a plain .mjs without types; a variable specifier keeps the type checker out of it.
const GUARD = '../../../../e2e/pixel/vk-guard.mjs';
const { violations } = (await import(/* @vite-ignore */ GUARD)) as { violations: (css: string) => string[] };

const FILES = [
  'layouts/card-paper.css', 'paper-states.css', 'layouts/card-quiet.css', 'quiet-states.css',
  'studio/card-studio.css', 'studio/card-states-studio.css', 'page/card-page-studio.css',
];
describe('vibekit components are placed, never restyled', () => {
  for (const f of FILES) {
    it(f, () => expect(violations(readFileSync(new URL(f, import.meta.url), 'utf8'))).toEqual([]));
  }
});
