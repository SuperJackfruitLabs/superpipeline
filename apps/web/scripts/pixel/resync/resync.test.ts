// apps/web/scripts/pixel/resync/resync.test.ts
import { afterAll, describe, expect, it } from 'vitest';
import { COMPONENT_MAP } from './components';
import { closeRenderer, renderComponent } from './render';
import { resyncHtml } from '../resync-references.mjs';

const BUTTON_REF = '<html lang="en" data-vibe="paper" data-theme="light"><head><style>.vk-button{border-radius:3px;background:#222}</style></head><body><button class="vk-button vk-button--primary">Dispatch</button></body></html>';

afterAll(() => closeRenderer());

describe('resync', () => {
  it('maps every component kind the rulings name', () => {
    expect(Object.keys(COMPONENT_MAP).sort()).toEqual(['AppNav', 'AppShell', 'AppearancePicker', 'Button', 'CommandField', 'CommandPalette', 'Dialog', 'Drawer', 'Face', 'Field', 'IconButton', 'Masthead', 'Menu', 'PhoneHeader', 'PhoneTabBar', 'Segmented', 'Sheet', 'StageTrack', 'StateLabel', 'StatusLine', 'Tabs'].sort());
  });
  it('replaces a mockup button with vibekit 0.0.1 Paper markup and drops the local rule', async () => {
    const out = await resyncHtml(BUTTON_REF);
    expect(out).toContain(await renderComponent('Button', { variant: 'primary', children: 'Dispatch' }, { vibe: 'paper', theme: 'light' }));
    expect(out).not.toMatch(/\.vk-button\s*\{/);
    expect(out).toMatch(/<html[^>]*data-product="superpipeline"[^>]*data-accent="product"/);
  });
  it('keeps layout and content: text outside components is byte-identical', async () => {
    const ref = BUTTON_REF.replace('<body>', '<body><p class="bd-intro">Seven live cards.</p>');
    expect(await resyncHtml(ref)).toContain('<p class="bd-intro">Seven live cards.</p>');
  });
  it('writes a label straight after its tag: no leading space', async () => {
    expect(await resyncHtml(BUTTON_REF)).toContain('<button type="button" class="vk-button vk-button--primary">Dispatch</button>');
  });
  it('gives every rendered id the page\'s own number, so two controls never share one', async () => {
    const seg = (l: string) => `<div class="vk-segmented" role="group" aria-label="${l}"><button class="vk-segmented__item" type="button" aria-pressed="true">A</button><button class="vk-segmented__item" type="button" aria-pressed="false">B</button></div>`;
    const out = await resyncHtml(BUTTON_REF.replace('<body>', `<body>${seg('One')}${seg('Two')}`));
    const ids = [...out.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBe(6);
    expect(new Set(ids).size).toBe(6);
    expect(out).not.toContain('bits-s');
  });
  it('keeps a layout-only rule behind a page class, drops the restyle', async () => {
    const ref = BUTTON_REF.replace('<style>', '<style>.dl-act .vk-button{max-width:100%;overflow:hidden;padding:0 14px;color:red}.x{color:blue}');
    const out = await resyncHtml(ref);
    expect(out).toContain('.dl-act .vk-button{ max-width:100%; overflow:hidden; }');
    expect(out).not.toMatch(/padding:0 14px|color:red/);
  });
  it('is idempotent', async () => {
    const once = await resyncHtml(BUTTON_REF);
    expect(await resyncHtml(once)).toBe(once);
  });
}, 60_000);
