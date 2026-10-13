// apps/web/src/lib/components/plan/FilterDialog.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import FilterDialog from './FilterDialog.svelte';
import { app } from '$lib/stores/app.svelte';
import { noFilters } from '$lib/stores/card-filters';

beforeEach(() => { app.filters = noFilters(); app.filterOpen = false; });
afterEach(cleanup);

describe('FilterDialog', () => {
  it('is closed until a shell opens it, and is vibekit’s Dialog', async () => {
    render(FilterDialog);
    expect(screen.queryByRole('dialog')).toBeNull();
    app.filterOpen = true;
    await tick();
    expect(screen.getByRole('dialog', { name: 'Filter cards' }).closest('.vk-dialog')).toBeTruthy();
  });
  it('a filter turned on shows as a chip, and Clear filters turns it off', async () => {
    app.filterOpen = true;
    render(FilterDialog);
    await tick();
    await fireEvent.click(screen.getByLabelText('show archived'));
    expect(app.filters.showArchived).toBe(true);
    expect(screen.getByRole('button', { name: 'Remove filter archived' })).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.filters).toEqual(noFilters());
  });
  it('Escape and Done close it', async () => {
    app.filterOpen = true;
    render(FilterDialog);
    await tick();
    await fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    await tick();
    expect(app.filterOpen).toBe(false);
    app.filterOpen = true;
    await tick();
    await fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(app.filterOpen).toBe(false);
  });
});
