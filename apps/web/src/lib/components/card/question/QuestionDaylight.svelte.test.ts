// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';

import { answerElicitation, questionPanelContract } from './question-panel.contract';
import QuestionDaylight from './QuestionDaylight.svelte';
import { QuestionAnswer } from './question-answer.svelte';
import type { Elicitation } from '$lib/api';

const agent = { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' as const };
const ask = (over: Partial<Elicitation> = {}): Elicitation =>
  ({
    id: 'eli_1',
    agentId: 'agt_r',
    question: 'Shall I run the tests?',
    signal: 'question',
    options: [
      { name: 'run_them', title: 'Run the tests' },
      { name: 'skip', title: 'Skip them' },
    ],
    ...over,
  }) as Elicitation;

function mount(e: Elicitation) {
  const model = new QuestionAnswer(() => ({ boardId: 'brd_1', elicitation: e, after: async () => {} }));
  const r = render(QuestionDaylight, { model, elicitation: e, agent, vibe: 'daylight' });
  return { model, ...r };
}

beforeEach(() => answerElicitation.mockReset().mockResolvedValue({ ok: true, json: async () => ({}) }));
afterEach(() => cleanup());

questionPanelContract(QuestionDaylight, { decision: 'button', busy: { kind: 'aria', status: 'Sending…' }, words: { heading: 'has a question', waiting: 'Sample agent · has a question', auth: 'needs you to sign in' } });

describe('QuestionDaylight', () => {
  it('is the .elicitation panel, with who is waiting and what they asked', () => {
    const { container } = mount(ask());
    const panel = container.querySelector('.elicitation')!;
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('has a question');
    expect(panel.textContent).toContain('Sample agent · has a question');
    expect(panel.textContent).toContain('Shall I run the tests?');
  });

  it('says sign-in for an auth signal', () => {
    const { container } = mount(ask({ signal: 'auth' } as never));
    expect(container.querySelector('.elicitation')!.textContent).toContain('needs you to sign in');
  });

  it('one button per option, with a note box', () => {
    mount(ask());
    expect(screen.getByRole('button', { name: 'Run the tests' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Skip them' })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Add a note for the agent (optional)' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send answer' })).toBeNull();
  });

  it('the first option is the primary one', () => {
    mount(ask());
    const first = screen.getByRole('button', { name: 'Run the tests' });
    const second = screen.getByRole('button', { name: 'Skip them' });
    expect(first.className).not.toBe(second.className);
    expect(first.className).toMatch(/vk-button--primary/);
    expect(second.className).not.toMatch(/\bvk-button--primary\b/);
  });

  it('with no options there is a free answer and Send answer', () => {
    mount(ask({ options: [] }));
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send answer' })).toBeTruthy();
  });

  it('clicking an option answers with it', async () => {
    mount(ask());
    await fireEvent.click(screen.getByRole('button', { name: 'Run the tests' }));
    expect(answerElicitation).toHaveBeenCalledWith('brd_1', 'eli_1', { option: 'run_them', text: undefined });
  });

  it('shows a refusal beside the question', async () => {
    answerElicitation.mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: { message: 'Already answered' } }) });
    mount(ask());
    await fireEvent.click(screen.getByRole('button', { name: 'Run the tests' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Already answered');
  });
});

describe('QuestionDaylight busy', () => {
  it('the pressed option keeps focus while the answer is sent', async () => {
    let settle!: (r: unknown) => void;
    answerElicitation.mockReset().mockReturnValue(new Promise((r) => (settle = r)));
    mount(ask());
    const run = screen.getByRole('button', { name: 'Run the tests' }) as HTMLButtonElement;
    run.focus();
    await fireEvent.click(run);
    await vi.waitFor(() => expect(run.getAttribute('aria-disabled')).toBe('true'));
    expect(run.disabled).toBe(false);
    expect(document.activeElement).toBe(run);
    settle({ ok: true, json: async () => ({}) });
  });
});
