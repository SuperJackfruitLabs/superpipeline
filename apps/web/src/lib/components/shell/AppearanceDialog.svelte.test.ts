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

  it('Shift+Tab from the checked vibe stays inside the dialog', async () => {
    appearance.set({ vibe: 'studio' });
    render(AppearanceDialog);
    const studio = screen.getByRole('radio', { name: /^Studio/ }) as HTMLInputElement;
    studio.focus();
    // Studio is the first tab stop of the dialog (one stop per radio group), so Shift+Tab wraps.
    const ev = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    studio.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Done' }));
  });

  it('Shift+Tab from the panel itself stays inside the dialog', async () => {
    render(AppearanceDialog);
    const panel = screen.getByRole('dialog');
    panel.focus();
    const ev = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    panel.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Done' }));
  });

  it('Escape is consumed so a card behind does not also close', () => {
    render(AppearanceDialog);
    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    screen.getByRole('dialog').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});
