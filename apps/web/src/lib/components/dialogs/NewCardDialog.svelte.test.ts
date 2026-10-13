// apps/web/src/lib/components/dialogs/NewCardDialog.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { AGENTS, DX_STAGES } from '../../../../e2e/pixel/fixture/dialog-cases';
import NewCardDialog from './NewCardDialog.svelte';
import { app } from '$lib/stores/app.svelte';
import { appearance } from '$lib/appearance.svelte';

const dispatchCard = vi.fn(async () => true);

async function openComposer(sentence = '') {
  render(NewCardDialog);
  app.requestCompose(sentence);
  await tick(); await tick();
}

beforeEach(() => {
  appearance.set({ vibe: 'daylight' });
  app.boardId = 'brd_134a0ddb6d434478';
  app.board = { boardId: 'brd_134a0ddb6d434478', name: 'Developer Experience', stages: DX_STAGES, cards: [], gates: [], elicitations: [], references: [] } as never;
  app.agents = AGENTS;
  app.labels = [
    { id: 'lbl_0259a14014754f69', name: 'clean-room' }, { id: 'lbl_e9ccaacaa2f94509', name: 'evidence-required' }, { id: 'lbl_8430ce51795447c3', name: 'superpipeline' },
  ] as never;
  app.projects = [{ id: 'prj_b', name: 'SJL Active Portfolio' }, { id: 'prj_a', name: 'Building in public — Marketing & Community flow' }] as never;
  app.boards = [];
  app.error = null;
  dispatchCard.mockClear();
  app.dispatchCard = dispatchCard as never;
});
afterEach(cleanup);

describe('NewCardDialog', () => {
  it('is vibekit’s dialog, Escape closes it and focus goes back to the opener', async () => {
    const opener = document.createElement('button'); opener.textContent = 'New card'; document.body.append(opener); opener.focus();
    await openComposer();
    const d = screen.getByRole('dialog', { name: 'What needs doing?' });
    expect(d.classList.contains('vk-dialog')).toBe(true);
    expect(d.classList.contains('nc')).toBe(true);
    expect(screen.getByRole('radiogroup', { name: 'Priority' }).closest('.vk-segmented')).toBeTruthy();
    await fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    await tick(); await tick();
    expect(screen.queryByRole('dialog', { name: 'What needs doing?' })).toBeNull();
    expect(app.composeOpen).toBe(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
  it('opens on request, with the sentence prefilled and focused, and no drafting controls', async () => {
    await openComposer('Fix the flaky login');
    expect(screen.getByRole('dialog', { name: 'What needs doing?' })).toBeTruthy();
    const sentence = screen.getByRole('textbox', { name: 'Describe it in a sentence' }) as HTMLTextAreaElement;
    expect(sentence.value).toBe('Fix the flaky login');
    expect(document.activeElement).toBe(sentence);
    expect(screen.getByRole('button', { name: 'Board: Developer Experience. Change board' }).textContent?.trim()).toBe('on Developer Experience');
    // The first stage (Reported) is a person's (#11): no agent in the lead or the brief's heading.
    expect(screen.getByText('Tell me in a sentence. You can change any of it before it goes.')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'What this card asks' })).toBeTruthy();
    await fireEvent.change(screen.getByRole('combobox', { name: 'Starts in stage' }), { target: { value: 'reproduce' } });
    expect(screen.getByText('Tell me in a sentence. An agent drafts the brief, and you can change any of it before it goes.')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Brief for the agent' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Draft/ })).toBeNull();
    expect(document.querySelector('.nc-draftrow, .nc-brief-tag')).toBeNull();
  });
  it('lists the stages with their owners and the projects by name, first stage chosen', async () => {
    await openComposer();
    const stage = screen.getByRole('combobox', { name: 'Starts in stage' }) as HTMLSelectElement;
    expect([...stage.options].map((o) => o.textContent)).toEqual([
      'Reported · a person', 'Reproduce · error-eric', 'Failing test · tester-tim', 'Fix · 2 agents', 'Integrate · 3 agents', 'Signed off · approval gate', 'Shipped · a person',
    ]);
    expect(stage.value).toBe('reported');
    const project = screen.getByRole('combobox', { name: 'Project (optional)' }) as HTMLSelectElement;
    expect([...project.options].map((o) => o.textContent)).toEqual(['No project', 'Building in public — Marketing & Community flow', 'SJL Active Portfolio']);
    expect(screen.getByText('Reported', { selector: 'strong' }).parentElement?.textContent).toBe('Goes to Reported on Developer Experience, where a person picks it up.');
  });
  it('dispatches on ⌘↵ with everything the form holds, and only once there is a title', async () => {
    await openComposer();
    const dispatch = screen.getByRole('button', { name: 'Dispatch' });
    expect(dispatch.getAttribute('aria-disabled')).toBe('true');
    await fireEvent.click(dispatch);
    expect(dispatchCard).not.toHaveBeenCalled();
    await fireEvent.input(screen.getByRole('textbox', { name: 'Card title' }), { target: { value: 'Ship it' } });
    await fireEvent.input(screen.getByRole('textbox', { name: 'What this card asks' }), { target: { value: 'Done looks like: shipped.' } });
    await fireEvent.click(screen.getByRole('radio', { name: 'P1' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Add label' }));
    await fireEvent.click(screen.getByRole('option', { name: 'clean-room' }));
    await fireEvent.keyDown(screen.getByRole('textbox', { name: 'Card title' }), { key: 'Enter', metaKey: true });
    expect(dispatchCard).toHaveBeenCalledWith('Ship it', {
      priority: 1, description: 'Done looks like: shipped.', due: '', stageKey: 'reported', labelIds: ['lbl_0259a14014754f69'], projectId: null, boardId: 'brd_134a0ddb6d434478',
    });
    await tick();
    expect(screen.queryByRole('dialog', { name: 'What needs doing?' })).toBeNull();
  });
  it('Escape in the label picker closes only the picker', async () => {
    await openComposer();
    await fireEvent.click(screen.getByRole('button', { name: 'Add label' }));
    await fireEvent.click(screen.getByRole('option', { name: 'clean-room' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Add label' }));
    await fireEvent.click(screen.getByRole('option', { name: 'evidence-required' }));
    expect(screen.getByRole('button', { name: 'Remove label evidence-required' })).toBeTruthy();
    await fireEvent.keyDown(screen.getByRole('listbox', { name: 'Labels' }), { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: 'Labels' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'What needs doing?' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'clean-room' })).toBeNull();
  });
  it('offers Clear only once a due date is set, and says why a dispatch failed', async () => {
    await openComposer();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    await fireEvent.input(screen.getByLabelText('Due (optional)'), { target: { value: '2026-10-18' } });
    expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy();
    dispatchCard.mockImplementationOnce(async () => { app.error = 'createCard failed (400)'; return false; });
    await fireEvent.input(screen.getByRole('textbox', { name: 'Card title' }), { target: { value: 'Ship it' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Dispatch' }));
    await tick();
    expect(screen.getByRole('alert').textContent).toBe('createCard failed (400)');
    expect(screen.getByRole('dialog', { name: 'What needs doing?' })).toBeTruthy();
  });
});
