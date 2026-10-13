// apps/web/src/lib/components/operate/layouts/OperateQuiet.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import OperateQuiet from './OperateQuiet.svelte';
import { fakeModel } from './fake-model';

afterEach(cleanup);

describe('OperateQuiet', () => {
  it('lists the needs most urgent first', () => {
    render(OperateQuiet, { model: fakeModel() });
    const titles = screen.getAllByRole('article').map((a) => a.querySelector('h3')!.textContent);
    expect(titles[0]).toMatch(/^Superpipeline: manual-delivery/);
    expect(titles[3]).toMatch(/^Fix the highest-severity/);
  });

  it('Show earlier reminders becomes Hide earlier reminders', async () => {
    render(OperateQuiet, { model: fakeModel() });
    const btn = screen.getAllByRole('button', { name: 'Show earlier reminders' })[0]!;
    await fireEvent.click(btn);
    expect(btn.textContent).toBe('Hide earlier reminders');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('a refusal reads "Not done: …"', async () => {
    render(OperateQuiet, { model: fakeModel({ resume: vi.fn(async () => 'card is not stopped') }) });
    const item = screen.getByRole('article', { name: /^AgentPod/ });
    await fireEvent.click(within(item).getByRole('button', { name: 'Resume' }));
    expect(within(item).getByRole('group', { name: 'Resume this card' })).toBeTruthy();
    await fireEvent.input(within(item).getByRole('textbox'), { target: { value: 'x' } });
    await fireEvent.click(within(item).getByRole('button', { name: 'Send back to work' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Not done: card is not stopped');
  });
});
