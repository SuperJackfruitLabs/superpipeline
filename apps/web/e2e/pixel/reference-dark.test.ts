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

describe('deriveDark: drop shadows stay dark (fix round 2)', () => {
  it('a light-theme shadow cast in the text colour becomes vibekit\'s dark shadow (the ground at 80%), not a glow', () => {
    const html = '<html><body><style>.s { box-shadow: 0 0 0 1px var(--vk-color-line), 0 30px 80px color-mix(in oklch, var(--vk-color-text) 30%, transparent); }</style><div data-vibe="paper" data-theme="light" class="s" style="box-shadow: 0 12px 32px color-mix(in oklch, var(--vk-color-text) 18%, transparent)"></div></body></html>';
    const out = deriveDark(html);
    expect(out).not.toMatch(/var\(--vk-color-text\) \d+%/);
    expect(out).toContain('0 30px 80px color-mix(in oklch, var(--vk-color-bg) 80%, transparent)');
    expect(out).toContain('0 12px 32px color-mix(in oklch, var(--vk-color-bg) 80%, transparent)');
    expect(out, 'the 1px line ring is not a cast shadow and stays').toContain('0 0 0 1px var(--vk-color-line)');
  });
  it('leaves an inset ring drawn in the text colour alone (it is a border, not a shadow)', () => {
    const html = '<html><body><style>.r { box-shadow: inset 0 0 0 2px var(--vk-color-text); }</style><div data-vibe="paper" data-theme="light"></div></body></html>';
    expect(deriveDark(html)).toContain('inset 0 0 0 2px var(--vk-color-text)');
  });
  it('SP-Card-Paper: the sheet shadow no longer glows in the derived dark', () => {
    const out = deriveDark(readFileSync(join(REF_DIR, 'SP-Card-Paper.html'), 'utf8'));
    expect(out).not.toContain('color-mix(in oklch, var(--vk-color-text) 30%, transparent)');
  });
});
