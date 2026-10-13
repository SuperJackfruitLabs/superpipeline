// apps/web/src/lib/components/operate/layouts/OperateDaylight.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import OperateDaylight from './OperateDaylight.svelte';
import { fakeModel } from './fake-model';
import { C58F8 } from '$lib/test/dx-snapshot';

afterEach(cleanup);
const agentpod = () => screen.getByRole('article', { name: /^AgentPod/ });

describe('OperateDaylight', () => {
  it('Show all expands the agent’s words and says Show less', async () => {
    render(OperateDaylight, { model: fakeModel() });
    const btn = within(agentpod()).getByRole('button', { name: 'Show all' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(btn);
    expect(within(agentpod()).getByRole('button', { name: 'Show less' }).getAttribute('aria-expanded')).toBe('true');
    expect(agentpod().textContent).toContain('no GitHub push was attempted.');
  });

  it('Resume swaps the actions for the form and focuses Resume at', async () => {
    render(OperateDaylight, { model: fakeModel() });
    await fireEvent.click(within(agentpod()).getByRole('button', { name: 'Resume' }));
    const form = screen.getByRole('form', { name: 'Resume tester-tim' });
    expect(document.activeElement).toBe(within(form).getByRole('combobox', { name: /Resume at/ }));
    expect(within(agentpod()).queryByRole('link', { name: 'Open card' })).toBeNull();
    expect((within(form).getByRole('combobox', { name: /Resume at/ }) as HTMLSelectElement).selectedOptions[0]!.textContent).toBe('Failing test (where it stopped)');
  });

  it('Send back to work waits for a note, then sends it trimmed, at the stage picked', async () => {
    const model = fakeModel();
    render(OperateDaylight, { model });
    await fireEvent.click(within(agentpod()).getByRole('button', { name: 'Resume' }));
    const send = screen.getByRole('button', { name: 'Send back to work' });
    expect(send.getAttribute('aria-disabled')).toBe('true');
    await fireEvent.click(send);
    expect(model.resume).not.toHaveBeenCalled();
    await fireEvent.input(screen.getByRole('textbox', { name: /What changed/ }), { target: { value: '  Writable now.  ' } });
    expect(send.getAttribute('aria-disabled')).toBe('false');
    await fireEvent.click(send);
    expect(model.resume).toHaveBeenCalledWith(expect.objectContaining({ card: expect.objectContaining({ id: C58F8.id }) }), 'Writable now.', 'test');
  });

  it('a refusal is said under the actions', async () => {
    render(OperateDaylight, { model: fakeModel({ resume: vi.fn(async () => 'card is not stopped') }) });
    await fireEvent.click(within(agentpod()).getByRole('button', { name: 'Resume' }));
    await fireEvent.input(screen.getByRole('textbox', { name: /What changed/ }), { target: { value: 'x' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Send back to work' }));
    expect((await screen.findByRole('alert')).textContent).toBe('card is not stopped');
  });

  it('Earlier reminders shows the older notices with their own Mark read', async () => {
    render(OperateDaylight, { model: fakeModel() });
    expect(screen.getAllByRole('button', { name: 'Mark read' })).toHaveLength(4);
    const earlier = screen.getAllByRole('button', { name: 'Earlier reminders' })[0]!;
    await fireEvent.click(earlier);
    expect(earlier.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('button', { name: 'Mark read' })).toHaveLength(8);
  });

  it('says so when nothing waits', () => {
    render(OperateDaylight, { model: fakeModel({ needs: [], needsUrgent: [], groups: [], unread: 0 }) });
    expect(screen.getByText('Nothing is waiting on you.')).toBeTruthy();
    expect(screen.getByText('Nothing unread.')).toBeTruthy();
  });
});
