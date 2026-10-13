// apps/web/src/lib/components/plan/list/ListQuiet.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import ListQuiet from './ListQuiet.svelte';
import { listProps } from '$lib/test/list-props';

afterEach(cleanup);

describe('ListQuiet', () => {
  it('Sort by sets the whole sort; Group by sets the grouping', async () => {
    const p = listProps();
    render(ListQuiet, p);
    await fireEvent.change(screen.getByRole('combobox', { name: /Sort by/ }), { target: { value: '5' } });
    expect(p.onSetSort).toHaveBeenCalledWith({ key: 'cost', ascending: false });
    await fireEvent.change(screen.getByRole('combobox', { name: /Group by/ }), { target: { value: 'owner' } });
    expect(p.onGroupBy).toHaveBeenCalledWith('owner');
  });

  it('a sort it does not list shows first, selected', () => {
    render(ListQuiet, listProps({ sort: { key: 'age', ascending: false } }));
    const picker = screen.getByRole('combobox', { name: /Sort by/ }) as HTMLSelectElement;
    expect(picker.selectedOptions[0]!.textContent).toBe('Age, highest first');
  });

  it('one table per group, each with its caption, and the empty stages named', () => {
    render(ListQuiet, listProps());
    expect(screen.getAllByRole('table').map((t) => t.querySelector('caption')!.textContent)).toEqual(['Reported', 'Reproduce', 'Failing test', 'Fix', 'Shipped']);
    expect(screen.getByText('Stages with no cards are not shown: Integrate, Signed off.')).toBeTruthy();
  });
});
