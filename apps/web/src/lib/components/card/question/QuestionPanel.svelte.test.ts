// @vitest-environment jsdom
/** The question panel on its own: options as choices or a free answer, a readable approval, and a refusal beside the question. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import type { Elicitation } from '$lib/api';

const answerElicitation = vi.fn();
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), answerElicitation: (...a: unknown[]) => answerElicitation(...a) }));
const { QuestionAnswer } = await import('./question-answer.svelte');
const { default: QuestionPanel } = await import('./QuestionPanel.svelte');
afterEach(() => cleanup());

const ask = (over: Partial<Elicitation> = {}): Elicitation => ({ id: 'eli_1', agentId: 'agt_r', question: 'Shall I run the tests?', signal: 'question', options: [{ name: 'run', title: 'Run the tests' }, { name: 'skip', title: 'Skip them' }], ...over }) as Elicitation;
function mount(e: Elicitation) {
  const model = new QuestionAnswer(() => ({ boardId: 'brd_1', elicitation: e, after: async () => {} }));
  return render(QuestionPanel, { model, elicitation: e, agent: { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' }, onMove: vi.fn() });
}
const ok = () => answerElicitation.mockReset().mockResolvedValue({ ok: true, json: async () => ({}) });

describe('QuestionPanel', () => {
  it('asks once, in a sentence, with who asks', () => {
    const { container } = mount(ask());
    expect(container.textContent!.split('Shall I run the tests?')).toHaveLength(2);
    expect(container.textContent).toContain('Sample agent asks:');
  });
  it('says sign-in for an auth signal', () => {
    const { container } = mount(ask({ signal: 'auth' } as never));
    expect(container.textContent).toContain('Sample agent needs you to sign in:');
  });
  it('with nothing chosen and nothing written, says to pick one and sends nothing', async () => {
    ok();
    mount(ask());
    await fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    expect(screen.getByRole('alert').textContent).toContain('Pick one of the options.');
    expect(answerElicitation).not.toHaveBeenCalled();
  });
  it('with no options, a free answer; an empty one says to type one', async () => {
    ok();
    mount(ask({ options: [] }));
    await fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    expect(screen.getByRole('alert').textContent).toContain('Type an answer first.');
    await fireEvent.input(screen.getByLabelText('Your answer'), { target: { value: 'yes' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    expect(answerElicitation).toHaveBeenCalledWith('brd_1', 'eli_1', { option: undefined, text: 'yes' });
  });
  it('reads a strict approval in plain words, its digest behind a closed toggle', () => {
    const detail = { version: 1 as const, summary: 'Create runs/run_x/answer.md in the workspace', reason: 'Write the sentence.', files: [{ path: 'runs/run_x/answer.md', change: 'create' as const, bytes: 249, preview: '# RFC' }], digest: 'f'.repeat(64) };
    const { container } = mount(ask({ question: 'Approve this exact operation? ' + 'f'.repeat(64), detail } as never));
    expect(container.textContent).toContain('Create runs/run_x/answer.md in the workspace');
    expect(container.textContent).toContain('249 bytes');
    const toggle = container.querySelector('details.approval-digest')!;
    expect(toggle.hasAttribute('open')).toBe(false);
    expect(container.querySelector('.approval-summary')!.textContent).not.toContain('f'.repeat(64));
  });
  it('shows a refusal beside the question', async () => {
    answerElicitation.mockReset().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: { message: 'Already answered' } }) });
    mount(ask());
    await fireEvent.click(screen.getByRole('radio', { name: /^Run the tests/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Answer' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Already answered');
  });
});
