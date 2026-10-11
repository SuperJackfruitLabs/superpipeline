// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Tabs from './Tabs.svelte';

afterEach(() => cleanup());

const body = (t: string) => createRawSnippet(() => ({ render: () => `<p>BODY-${t}</p>` }));
const tabs = [
  { id: 'a', label: 'Alpha', panel: body('a') },
  { id: 'b', label: 'Beta 2', panel: body('b') },
  { id: 'c', label: 'Gamma', panel: body('c') },
];
const mount = (active = 'a') => render(Tabs, { label: 'Sections', tabs, active });
const tab = (n: string) => screen.getByRole('tab', { name: n });

describe('Tabs (the APG tabs pattern)', () => {
  it('is a labelled tablist of tabs wired to their panels', () => {
    mount();
    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    const a = tab('Alpha');
    expect(a.getAttribute('aria-selected')).toBe('true');
    expect(tab('Beta 2').getAttribute('aria-selected')).toBe('false');
    const panel = document.getElementById(a.getAttribute('aria-controls')!)!;
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(a.id);
  });

  it('keeps every panel in the DOM and shows only the active one', () => {
    const { container } = mount();
    const panels = container.querySelectorAll('[role="tabpanel"]');
    expect(panels).toHaveLength(3);
    expect([...panels].map((p) => (p as HTMLElement).hidden)).toEqual([false, true, true]);
    for (const t of ['a', 'b', 'c']) expect(screen.getAllByText(`BODY-${t}`, { ignore: 'x' })).toHaveLength(1);
  });

  it('rolls the tab stop: only the selected tab is tabbable', () => {
    mount('b');
    expect(tab('Alpha').tabIndex).toBe(-1);
    expect(tab('Beta 2').tabIndex).toBe(0);
    expect(tab('Gamma').tabIndex).toBe(-1);
  });

  it('arrows move focus and selection, and wrap', async () => {
    mount();
    tab('Alpha').focus();
    await fireEvent.keyDown(tab('Alpha'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab('Beta 2'));
    expect(tab('Beta 2').getAttribute('aria-selected')).toBe('true');
    await fireEvent.keyDown(tab('Beta 2'), { key: 'ArrowRight' });
    await fireEvent.keyDown(tab('Gamma'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab('Alpha'));
    await fireEvent.keyDown(tab('Alpha'), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tab('Gamma'));
    expect(tab('Gamma').getAttribute('aria-selected')).toBe('true');
  });

  it('Home and End go to the ends', async () => {
    mount('b');
    await fireEvent.keyDown(tab('Beta 2'), { key: 'End' });
    expect(document.activeElement).toBe(tab('Gamma'));
    await fireEvent.keyDown(tab('Gamma'), { key: 'Home' });
    expect(document.activeElement).toBe(tab('Alpha'));
  });

  it('a click selects, and the panel follows', async () => {
    const { container } = mount();
    await fireEvent.click(tab('Gamma'));
    const panels = [...container.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
    expect(panels.map((p) => p.hidden)).toEqual([true, true, false]);
  });
});
