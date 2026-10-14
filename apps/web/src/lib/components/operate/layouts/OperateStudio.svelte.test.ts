// apps/web/src/lib/components/operate/layouts/OperateStudio.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import OperateStudio from './OperateStudio.svelte';
import { fakeModel } from './fake-model';
import { C4605, C58F8 } from '$lib/test/dx-snapshot';

afterEach(cleanup);
const selected = () => document.querySelector('tr.sel[aria-current="true"]');

describe('OperateStudio keyboard', () => {
  it('starts on the first row; J and K move; keys in a field are ignored', async () => {
    render(OperateStudio, { model: fakeModel() });
    expect(selected()?.textContent).toContain('Diagnose Melissa');
    await fireEvent.keyDown(window, { key: 'j' });
    expect(selected()?.textContent).toContain('AgentPod');
    await fireEvent.keyDown(window, { key: 'k' });
    await fireEvent.keyDown(window, { key: 'k' });
    expect(selected()?.textContent).toContain('Diagnose Melissa');
    await fireEvent.keyDown(screen.getByLabelText('Board cap $'), { key: 'j' });
    expect(selected()?.textContent).toContain('Diagnose Melissa');
  });

  it('O opens the selected card, R opens its resume row', async () => {
    const model = fakeModel();
    render(OperateStudio, { model });
    await fireEvent.keyDown(window, { key: 'o' });
    expect(model.open).toHaveBeenCalledWith(C4605.id, model.needs[0]!.boardId);
    await fireEvent.keyDown(window, { key: 'j' });
    await fireEvent.keyDown(window, { key: 'r' });
    expect(screen.getByRole('form', { name: 'Resume tester-tim' })).toBeTruthy();
    expect(document.activeElement?.id).toBe(`resume-at-${C58F8.id}`);
  });

  it('. marks the selected card’s newest notice read; a modifier does nothing', async () => {
    const model = fakeModel();
    render(OperateStudio, { model });
    await fireEvent.keyDown(window, { key: '.', metaKey: true });
    expect(model.markRead).not.toHaveBeenCalled();
    await fireEvent.keyDown(window, { key: '.' });
    expect(model.markRead).toHaveBeenCalledWith(model.groups.find((g) => g.cardId === C4605.id)!.latest.seq, model.groups[0]!.boardId);
  });

  it('M on the unclaimed row opens the stage menu', async () => {
    render(OperateStudio, { model: fakeModel() });
    for (let i = 0; i < 3; i++) await fireEvent.keyDown(window, { key: 'j' });
    await fireEvent.keyDown(window, { key: 'm' });
    expect(screen.getByRole('menu', { name: 'Move to' })).toBeTruthy();
  });

  it('a bad cap is refused beside its field and nothing is sent', async () => {
    const model = fakeModel({ setCaps: async () => ({ board: 'Enter an amount in dollars, like 25 or 25.50.', card: null, refused: null }) });
    render(OperateStudio, { model });
    await fireEvent.input(screen.getByLabelText('Board cap $'), { target: { value: 'lots' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save caps' }));
    expect(await screen.findByText('Enter an amount in dollars, like 25 or 25.50.')).toBeTruthy();
  });
});
