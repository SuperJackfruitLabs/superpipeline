// apps/web/e2e/pixel/reference-dark.test.ts — pins the derived-dark Appearance patch (Task 39): a swapped
// light file must check "Dark" and say the dark hint, as the canvas did when it exported the dark state.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { applyDarkPatches, deriveDark, REF_DIR } from './reference';

describe('applyDarkPatches on SP-Dlg-Appearance', () => {
  for (const v of ['Daylight', 'Paper', 'Studio', 'Quiet']) it(`${v}: Dark is checked, with its hint`, async () => {
    const html = deriveDark(readFileSync(join(REF_DIR, `SP-Dlg-Appearance-${v}.html`), 'utf8'));
    const { window } = new JSDOM(html);
    const document = window.document;
    // The patch runs in the page: give it this document as its global while it does.
    const page = { evaluate: async (fn: (a: unknown) => unknown, arg?: unknown) => {
      const g = globalThis as { document?: Document };
      const was = g.document; g.document = document;
      try { return fn(arg); } finally { g.document = was; }
    } } as never;
    await applyDarkPatches(page);
    const group = document.querySelector('[role="radiogroup"][aria-label="Light or dark"]')!;
    const radios = [...group.querySelectorAll('[role="radio"]')].map((r) => [r.textContent?.trim(), r.getAttribute('aria-checked'), r.getAttribute('data-state')]);
    expect(radios).toContainEqual(['Dark', 'true', 'checked']);
    expect(radios.filter((r) => r[1] === 'true')).toHaveLength(1);
    expect(group.parentElement!.querySelector('.ap-hint')!.textContent).toBe('Always dark: a lamp-lit room, not black.');
  });
});
