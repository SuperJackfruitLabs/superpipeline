// apps/web/src/lib/focus-rule.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the global focus ring', () => {
  it('keeps the specificity of a bare :focus-visible, so a component rule such as .pcd:focus-visible still wins', () => {
    const sel = /(^|\})\s*([^{}]*:focus-visible[^{}]*)\{\s*outline: var\(--focus\)/m.exec(css)?.[2]?.trim();
    expect(sel).toBeDefined();
    // Anything after :focus-visible must sit in :where(), which adds no specificity.
    expect(sel!.replace(/:where\((?:[^()]|\([^()]*\))*\)/g, '')).toBe(':focus-visible');
  });
});
