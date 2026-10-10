// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import AppearanceDialog from './AppearanceDialog.svelte';
import { appearance } from '$lib/appearance.svelte';

describe('AppearanceDialog', () => {
  beforeEach(() => {
    document.cookie = 'vk_appearance=; Max-Age=0; Path=/';
    appearance.init(() => new Date(2026, 9, 11, 13, 0));
    appearance.pickerOpen = true;
  });
  afterEach(() => { cleanup(); appearance.dispose(); appearance.pickerOpen = false; });

  it('is a labelled modal dialog', () => {
    render(AppearanceDialog);
    const d = screen.getByRole('dialog', { name: 'Appearance' });
    expect(d.getAttribute('aria-modal')).toBe('true');
  });

  it('offers the four vibes as radios and applies a choice at once', async () => {
    render(AppearanceDialog);
    for (const n of ['Daylight', 'Paper', 'Studio', 'Quiet']) expect(screen.getByRole('radio', { name: new RegExp(`^${n}`) })).toBeTruthy();
    await fireEvent.click(screen.getByRole('radio', { name: /^Paper/ }));
    expect(appearance.value.vibe).toBe('paper');
    expect(document.documentElement.getAttribute('data-vibe')).toBe('paper');
  });

  it('sets light, dark or follow the sun', async () => {
    render(AppearanceDialog);
    await fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(appearance.value.theme).toBe('dark');
    await fireEvent.click(screen.getByRole('radio', { name: 'Follow the sun' }));
    expect(appearance.value.theme).toBe('sun');
  });

  it('sets the time-of-day strength', async () => {
    render(AppearanceDialog);
    await fireEvent.click(screen.getByRole('radio', { name: 'Off' }));
    expect(appearance.value.timeStrength).toBe('off');
  });

  it('the location switch says why it is off when refused', async () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_: unknown, no: (e: unknown) => void) => no(new Error('no')) } });
    render(AppearanceDialog);
    const sw = screen.getByRole('switch', { name: 'Use my location for the sun' });
    await fireEvent.click(sw);
    expect(await screen.findByText('Location was not shared, so the sun follows your time zone.')).toBeTruthy();
    expect(sw.getAttribute('aria-checked')).toBe('false');
  });

  it('turning the switch off while a request is pending stops it from turning back on', async () => {
    let answer: (p: unknown) => void = () => {};
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (ok: (p: unknown) => void) => { answer = ok; } } });
    render(AppearanceDialog);
    const sw = screen.getByRole('switch', { name: 'Use my location for the sun' });
    await fireEvent.click(sw);
    await fireEvent.click(sw);
    answer({ coords: { latitude: 51.5, longitude: -0.1 } });
    await new Promise((r) => setTimeout(r, 0));
    expect(appearance.value.useLocation).toBe(false);
    expect(sw.getAttribute('aria-checked')).toBe('false');
  });

  it('the switch off calls stopUsingLocation', async () => {
    appearance.set({ useLocation: true });
    render(AppearanceDialog);
    await fireEvent.click(screen.getByRole('switch', { name: 'Use my location for the sun' }));
    expect(appearance.value.useLocation).toBe(false);
  });

  it('Done and Escape close it', async () => {
    render(AppearanceDialog);
    await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(appearance.pickerOpen).toBe(false);
    appearance.pickerOpen = true;
    await fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    expect(appearance.pickerOpen).toBe(false);
  });
});
