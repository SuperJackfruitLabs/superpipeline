// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import AppearanceDialog from './AppearanceDialog.svelte';
import { appearance } from '$lib/appearance.svelte';

beforeEach(() => { appearance.setAccent('product'); appearance.pickerOpen = false; });
afterEach(() => { cleanup(); appearance.pickerOpen = false; });

async function open() {
  render(AppearanceDialog);
  appearance.pickerOpen = true;
  await tick(); await tick();
}

describe('AppearanceDialog', () => {
  it('is vibekit’s dialog around its picker; the accent applies at once', async () => {
    await open();
    expect(screen.getByRole('dialog', { name: 'Appearance' }).classList.contains('vk-dialog')).toBe(true);
    await fireEvent.click(screen.getByRole('radio', { name: /Violet/ }));
    expect(appearance.accent).toBe('violet');
    expect(document.documentElement.dataset.accent).toBe('violet');
    await fireEvent.click(screen.getByRole('radio', { name: /Product colour \(default\)/ }));
    expect(appearance.accent).toBe('product');
  });
  it('Done closes', async () => {
    await open();
    await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(appearance.pickerOpen).toBe(false);
  });
});
