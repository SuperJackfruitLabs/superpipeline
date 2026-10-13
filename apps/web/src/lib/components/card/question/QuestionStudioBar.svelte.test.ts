// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/svelte';
import { answerElicitation, ask, mountQuestion } from './question-panel.contract';
import QuestionStudioBar from './QuestionStudioBar.svelte';
import QuestionStudioFrame from './QuestionStudioFrame.svelte';
import { render } from '@testing-library/svelte';

beforeEach(() => answerElicitation.mockReset().mockResolvedValue({ ok: true, json: async () => ({}) }));
afterEach(() => cleanup());

describe('QuestionStudioBar', () => {
  it('a free answer is sent with Send answer; empty says to type one', async () => {
    mountQuestion(QuestionStudioBar, ask({ options: [] }));
    expect(screen.getByText('Empty: “Type an answer first.”')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: /Send answer/ }));
    expect(screen.getByRole('alert').textContent).toContain('Type an answer first.');
    await fireEvent.input(screen.getByLabelText('Answer to Sample agent'), { target: { value: 'yes' } });
    await fireEvent.click(screen.getByRole('button', { name: /Send answer/ }));
    expect(answerElicitation).toHaveBeenCalledWith('brd_1', 'eli_1', { option: undefined, text: 'yes' });
  });
  it('an option answers with it, and the note goes along', async () => {
    mountQuestion(QuestionStudioBar, ask());
    await fireEvent.input(screen.getByLabelText(/Note to Sample agent/), { target: { value: 'because' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Run the tests' }));
    expect(answerElicitation).toHaveBeenCalledWith('brd_1', 'eli_1', { option: 'run_them', text: 'because' });
  });
  it('a busy answer keeps its button focusable and says Sending…', async () => {
    let settle!: (r: unknown) => void;
    answerElicitation.mockReset().mockReturnValue(new Promise((r) => (settle = r)));
    mountQuestion(QuestionStudioBar, ask({ options: [] }));
    await fireEvent.input(screen.getByLabelText('Answer to Sample agent'), { target: { value: 'yes' } });
    const send = screen.getByRole('button', { name: /Send answer/ });
    send.focus();
    await fireEvent.click(send);
    await Promise.resolve();
    expect(send.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(send);
    expect(screen.getByRole('status').textContent).toBe('Sending…');
    settle({ ok: true, json: async () => ({}) });
    await Promise.resolve();
  });
  it('the frame says who asked and what, once', () => {
    const { container } = render(QuestionStudioFrame, { elicitation: ask(), agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' } });
    expect(container.textContent).toContain('Sample agent · question pending');
    expect(container.textContent!.split('Shall I run the tests?')).toHaveLength(2);
  });
});
