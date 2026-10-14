// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import LogoMotion from './LogoMotion.svelte';
import { resetIntroForTest, type LogoMotionLib } from '$lib/logo-motion';

const BUNDLE = readFileSync(join(__dirname, '..', '..', '..', 'static', 'brand', 'logo-motion.js'), 'utf8');

let reduce = false;
const listeners = new Set<unknown>();
let lib: LogoMotionLib;
let plays = 0;

beforeEach(() => {
  reduce = false;
  listeners.clear();
  plays = 0;
  resetIntroForTest();
  window.matchMedia = ((query: string) => ({
    get matches() { return query.includes('reduced-motion') && reduce; },
    media: query,
    addEventListener: (_: string, f: unknown) => listeners.add(f),
    removeEventListener: (_: string, f: unknown) => listeners.delete(f),
  })) as never;
  delete window.SJLLogoMotion;
  window.eval(BUNDLE); // the generated bundle, as the script tag would run it
  const real = window.SJLLogoMotion!;
  lib = {
    create(el, id) {
      const inst = real.create(el, id);
      return { ...inst, play: () => { plays++; return inst.play(); } };
    },
  };
  window.SJLLogoMotion = lib;
});
afterEach(cleanup);

const settle = async () => { for (let i = 0; i < 3; i++) { await Promise.resolve(); await tick(); } };

describe('LogoMotion', () => {
  it('mounts one Channel svg and removes it and its listener on unmount', async () => {
    const { container, unmount } = render(LogoMotion);
    await settle();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelector('[data-motion-part="channel-upper"]')).not.toBeNull();
    expect(listeners.size).toBe(1);
    unmount();
    expect(container.querySelector('svg')).toBeNull();
    expect(listeners.size).toBe(0);
  });

  it('plays nothing under reduced motion: replay() says static, the intro never starts', async () => {
    reduce = true;
    const { component } = render(LogoMotion, { playIntro: true });
    await settle();
    expect(plays).toBe(0);
    expect(await (component as unknown as { replay(): Promise<string> }).replay()).toBe('static');
    expect(plays).toBe(0);
  });

  it("honours the app's data-motion=\"reduce\" without calling play", async () => {
    document.documentElement.setAttribute('data-motion', 'reduce');
    try {
      const { component } = render(LogoMotion, { playIntro: true });
      await settle();
      expect(await (component as unknown as { replay(): Promise<string> }).replay()).toBe('static');
      expect(plays).toBe(0);
    } finally {
      document.documentElement.removeAttribute('data-motion');
    }
  });

  it('the intro plays once per session: a later loading screen (a route change) does not replay it', async () => {
    render(LogoMotion, { playIntro: true });
    await settle();
    expect(plays).toBe(1);
    cleanup();
    render(LogoMotion, { playIntro: true });
    await settle();
    expect(plays).toBe(1);
  });

  it('keeps its accessible name: hidden beside the name, the label when it stands alone', async () => {
    const hidden = render(LogoMotion).container;
    await settle();
    expect(hidden.querySelector('[data-testid="logo-motion"]')!.getAttribute('aria-hidden')).toBe('true');
    cleanup();
    const { container, component } = render(LogoMotion, { label: 'Superpipeline' });
    await settle();
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Superpipeline');
    await (component as unknown as { replay(): Promise<string> }).replay();
    expect(svg.getAttribute('aria-label')).toBe('Superpipeline');
    expect(container.querySelector('[data-testid="logo-motion"]')!.getAttribute('aria-hidden')).toBeNull();
  });
});
