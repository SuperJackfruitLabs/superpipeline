// apps/web/src/lib/components/parts/Icon.svelte.test.ts
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import { ICON_NAMES, ICON_PATHS } from '@superjackfruit/vibekit';
import Icon from './Icon.svelte';
import { NAV_ICONS, PRODUCT_ICONS, VK_ALIASES, type IconName } from './icons';

afterEach(cleanup);

const CORRECTIONS = readFileSync(join(process.cwd(), 'e2e/reference/mockups/CORRECTIONS.md'), 'utf8');

describe('Icon', () => {
  it('draws a vibekit name with vibekit’s own paths', () => {
    const { container } = render(Icon, { name: 'search' });
    const ds = [...container.querySelectorAll('path')].map((p) => p.getAttribute('d'));
    expect(ds).toEqual([...ICON_PATHS.search.d]);
  });
  it('keeps no product glyph that vibekit already draws', () => {
    for (const k of Object.keys(PRODUCT_ICONS)) {
      expect((ICON_NAMES as readonly string[]).includes(k), k).toBe(false);
      expect(k in VK_ALIASES, k).toBe(false);
    }
  });
  it('has the card glyphs the Daylight drawer and card states draw (Task 20)', () => {
    for (const k of ['open-window', 'edit', 'pushpin', 'send', 'archive', 'trash', 'flag', 'seal', 'restore']) expect(k in PRODUCT_ICONS, k).toBe(true);
  });
  it('logs every product glyph as a CORRECTIONS.md deviation', () => {
    const rows = CORRECTIONS.split('\n').filter((l) => l.includes('no vibekit icon'));
    for (const k of Object.keys(PRODUCT_ICONS)) expect(rows.some((r) => r.includes(`\`${k}\``)), k).toBe(true);
  });
  it('draws the nav v2 glyphs (Inbox tray, Crew faces) in the 24 frame at stroke 1.8, never filled', () => {
    for (const name of Object.keys(NAV_ICONS) as IconName[]) {
      const { container } = render(Icon, { name, size: 22, strokeWidth: 1.8 });
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('viewBox'), name).toBe('0 0 24 24');
      expect(svg.getAttribute('fill'), name).toBe('none');
      expect(svg.getAttribute('stroke-width'), name).toBe('1.8');
      expect(svg.children.length, name).toBeGreaterThan(0);
      cleanup();
    }
  });
  it('draws every product glyph, hidden from assistive tech', () => {
    for (const name of Object.keys(PRODUCT_ICONS) as IconName[]) {
      const { container } = render(Icon, { name, size: 18 });
      const svg = container.querySelector('svg')!;
      expect(svg.getAttribute('aria-hidden'), name).toBe('true');
      expect(svg.getAttribute('width'), name).toBe('18');
      expect(svg.children.length, name).toBeGreaterThan(0);
      cleanup();
    }
  });
  it('a vibekit name drawn filled or bare is never blank', () => {
    for (const props of [{ name: 'search' as const, filled: true }, { name: 'chev' as const, bare: true }]) {
      const { container } = render(Icon, props);
      expect(container.querySelector('svg')!.children.length, props.name).toBeGreaterThan(0);
      cleanup();
    }
  });
  it('fills when asked and goes bare for the phone stylesheet', () => {
    const { container } = render(Icon, { name: 'plan', filled: true });
    expect(container.querySelector('svg')!.getAttribute('fill')).toBe('currentColor');
    cleanup();
    const bare = render(Icon, { name: 'plan-phone', bare: true });
    const svg = bare.container.querySelector('svg')!;
    expect(svg.getAttribute('class')).toBe('ico');
    expect(svg.hasAttribute('width')).toBe(false);
  });
});
