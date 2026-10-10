// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppearanceStore, roughPlace } from './appearance.svelte';

const html = () => document.documentElement;
const at = (h: number) => () => new Date(2026, 9, 11, h, 0, 0);
const written: string[] = [];
const writer = (c: string) => { written.push(c); document.cookie = c; };

function reset(): void {
  document.cookie = 'vk_appearance=; Max-Age=0; Path=/';
  for (const a of ['data-vibe', 'data-theme', 'data-phase', 'data-time']) html().removeAttribute(a);
  localStorage.clear();
  written.length = 0;
}

describe('AppearanceStore', () => {
  let s: AppearanceStore;
  beforeEach(() => { reset(); s = new AppearanceStore(writer); });
  afterEach(() => s.dispose());

  it('a first visit is Daylight following the sun: light at noon', () => {
    s.init(at(13));
    expect(html().getAttribute('data-vibe')).toBe('daylight');
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(html().getAttribute('data-phase')).toBe('noon');
    expect(html().getAttribute('data-time')).toBe('strong');
  });

  it('following the sun is dark at night', () => {
    s.init(at(23));
    expect(s.theme).toBe('dark');
    expect(html().getAttribute('data-theme')).toBe('dark');
  });

  it('reads the cookie', () => {
    document.cookie = 'vk_appearance=paper.dark.subtle.0; Path=/';
    s.init(at(13));
    expect(s.value).toEqual({ vibe: 'paper', theme: 'dark', timeStrength: 'subtle', useLocation: false });
    expect(html().getAttribute('data-vibe')).toBe('paper');
    expect(html().getAttribute('data-theme')).toBe('dark');
  });

  it('a malformed cookie falls back to the defaults and does not throw', () => {
    document.cookie = 'vk_appearance=neon.%3Cimg%3E; Path=/';
    expect(() => s.init(at(13))).not.toThrow();
    expect(s.value.vibe).toBe('daylight');
    expect(s.value.theme).toBe('sun');
  });

  it('set writes the cookie for this host only', () => {
    s.init(at(13));
    s.set({ vibe: 'studio' });
    const c = written.at(-1)!;
    expect(c).toMatch(/^vk_appearance=studio\.sun\.strong\.0; /);
    expect(c).not.toMatch(/Domain=/i);
    expect(html().getAttribute('data-vibe')).toBe('studio');
  });

  it('choosing Quiet turns time of day off while it was still the default', () => {
    s.init(at(13));
    s.set({ vibe: 'quiet' });
    expect(s.value.timeStrength).toBe('off');
    expect(html().getAttribute('data-time')).toBe('off');
  });

  it('a strength the person chose survives a vibe change', () => {
    s.init(at(13));
    s.set({ timeStrength: 'subtle' });
    s.set({ vibe: 'quiet' });
    expect(s.value.timeStrength).toBe('subtle');
  });

  it('toggleTheme picks the opposite of what is showing', () => {
    s.init(at(13));
    s.toggleTheme();
    expect(s.value.theme).toBe('dark');
    s.toggleTheme();
    expect(s.value.theme).toBe('light');
  });

  it('turning location off forgets the place', () => {
    localStorage.setItem('superpipeline.place', JSON.stringify({ latitude: 51.5, longitude: -0.1 }));
    document.cookie = 'vk_appearance=daylight.sun.strong.1; Path=/';
    s.init(at(13));
    expect(s.place).toEqual({ latitude: 51.5, longitude: -0.1 });
    s.set({ useLocation: false });
    expect(s.place).toBeNull();
    expect(localStorage.getItem('superpipeline.place')).toBeNull();
  });

  it('a refused location leaves the switch off and does not throw', async () => {
    s.init(at(13));
    const geo = { getCurrentPosition: (_ok: unknown, no: (e: unknown) => void) => no(new Error('denied')) } as unknown as Geolocation;
    await expect(s.useLocation(geo)).resolves.toBe('denied');
    expect(s.value.useLocation).toBe(false);
  });

  it('a granted location is stored rough, on this device', async () => {
    s.init(at(13));
    const geo = { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 51.5072, longitude: -0.1276 } }) } as unknown as Geolocation;
    await expect(s.useLocation(geo)).resolves.toBe('on');
    expect(JSON.parse(localStorage.getItem('superpipeline.place')!)).toEqual({ latitude: 51.5, longitude: -0.1 });
    expect(written.at(-1)).toMatch(/^vk_appearance=daylight\.sun\.strong\.1; /);
  });

  it('forgets the legacy theme key once read', () => {
    localStorage.setItem('superpipeline.theme', 'light');
    s.init(at(13));
    expect(localStorage.getItem('superpipeline.theme')).toBeNull();
  });

  it('rounds a place to one decimal', () => {
    expect(roughPlace({ latitude: 51.5072, longitude: -0.1276 })).toEqual({ latitude: 51.5, longitude: -0.1 });
  });
});
