// @vitest-environment jsdom
/**
 * The parity net for every vibe's question panel (spec §5.3, §7 D14-D15). A panel's own test file
 * imports this before the component, so the api mock below is in place first.
 */
import type { Component } from 'svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import type { Elicitation } from '$lib/api';
import { QuestionAnswer } from './question-answer.svelte';
import { expectBusy, type BusyForm } from '../busy-contract';

export const PRIMARY = /\bbg-primary\b|\bvk-button--primary\b/;
export const answerElicitation = vi.fn();
vi.mock('$lib/api', async (orig) => ({
  ...(await orig<typeof import('$lib/api')>()),
  answerElicitation: (...a: unknown[]) => answerElicitation(...a),
}));

export const questionAgent = { id: 'agt_r', name: 'Sample agent', iconUrl: null, mood: 'needs' as const };
export const ask = (over: Partial<Elicitation> = {}): Elicitation =>
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

export function mountQuestion(C: Component<any>, e: Elicitation) {
  const model = new QuestionAnswer(() => ({ boardId: 'brd_1', elicitation: e, after: async () => {} }));
  const r = render(C, { model, elicitation: e, agent: questionAgent, vibe: 'daylight' });
  return { model, ...r };
}

export interface QuestionWords { heading: string; waiting: string; auth: string }
export const OLD_QUESTION_WORDS: QuestionWords = { heading: 'awaiting your answer', waiting: 'Sample agent is waiting', auth: 'awaiting your sign-in' };

export function questionPanelContract(
  C: Component<any>,
  o: { decision: 'button' | 'radio'; submit?: string; noteLabel?: string; answerLabel?: string | RegExp; words?: QuestionWords; busy?: BusyForm },
): void {
  const w = o.words ?? OLD_QUESTION_WORDS;
  const busy = o.busy ?? { kind: 'disabled' };
  const noteLabel = o.noteLabel ?? 'Add a note for the agent (optional)';
  const answerLabel = o.answerLabel ?? 'Your answer';
  const choose = async (name: string) => {
    await fireEvent.click(screen.getByRole(o.decision, { name }));
    if (o.decision === 'radio') await fireEvent.click(screen.getByRole('button', { name: o.submit! }));
  };
  describe('question panel contract', () => {
    afterEach(() => cleanup());

    // Readable approvals: a strict decision's structured detail says what is being approved.
    const detail = {
      version: 1 as const,
      summary: 'Create runs/run_x/answer.md in the workspace',
      reason: 'Write the quoted sentence the card asks for.',
      files: [{ path: 'runs/run_x/answer.md', change: 'create' as const, bytes: 249, preview: '# RFC 9110: 502 Bad Gateway' }],
      digest: 'f'.repeat(64),
    };
    it('shows an approval in plain words: summary, each file with size and preview, the reason', () => {
      const { container } = mountQuestion(C, ask({ question: 'Approve this exact operation? workspace ' + 'f'.repeat(64), detail } as never));
      const panel = container.querySelector('.elicitation')!;
      expect(panel.textContent).toContain('Create runs/run_x/answer.md in the workspace');
      expect(panel.textContent).toContain('runs/run_x/answer.md');
      expect(panel.textContent).toContain('249 bytes');
      expect(panel.textContent).toContain('# RFC 9110: 502 Bad Gateway');
      expect(panel.textContent).toContain('Write the quoted sentence the card asks for.');
    });
    it('keeps the digest behind a details toggle, not in the headline', () => {
      const { container } = mountQuestion(C, ask({ question: 'Approve this exact operation? workspace ' + 'f'.repeat(64), detail } as never));
      const toggle = container.querySelector('details.approval-digest');
      expect(toggle).toBeTruthy();
      expect(toggle!.hasAttribute('open')).toBe(false);
      expect(toggle!.textContent).toContain('f'.repeat(64));
      // With a detail, the raw digest question is not the headline.
      const headline = container.querySelector('.approval-summary')!;
      expect(headline.textContent).not.toContain('f'.repeat(64));
    });
    it('without a detail, shows the question as before and no approval block', () => {
      const { container } = mountQuestion(C, ask());
      expect(container.querySelector('.approval-detail')).toBeNull();
    });
    const ok = () => answerElicitation.mockReset().mockResolvedValue({ ok: true, json: async () => ({}) });

    it('is the .elicitation panel: heading, who is waiting, the question', () => {
      const { container } = mountQuestion(C, ask());
      const panel = container.querySelector('.elicitation')!;
      expect(panel.textContent).toContain(w.heading);
      expect(panel.textContent).toContain(w.waiting);
      expect(panel.textContent).toContain('Shall I run the tests?');
    });

    it('says the question once in its own render', () => {
      const { container } = mountQuestion(C, ask());
      expect(container.textContent!.split('Shall I run the tests?')).toHaveLength(2);
    });

    it('says sign-in for an auth signal', () => {
      const { container } = mountQuestion(C, ask({ signal: 'auth' } as never));
      expect(container.querySelector('.elicitation')!.textContent).toContain(w.auth);
    });

    it('offers every option and a note', () => {
      mountQuestion(C, ask());
      expect(screen.getByRole(o.decision, { name: 'Run the tests' })).toBeTruthy();
      expect(screen.getByRole(o.decision, { name: 'Skip them' })).toBeTruthy();
      expect(screen.getByRole('textbox', { name: noteLabel })).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Send answer' })).toBeNull();
    });

    it('choosing an option answers with it, and the note goes along', async () => {
      ok();
      mountQuestion(C, ask());
      await fireEvent.input(screen.getByRole('textbox', { name: noteLabel }), { target: { value: 'because' } });
      await choose('Run the tests');
      expect(answerElicitation).toHaveBeenCalledWith('brd_1', 'eli_1', { option: 'run_them', text: 'because' });
    });

    it('with no options there is a free answer and Send answer', async () => {
      ok();
      mountQuestion(C, ask({ options: [] }));
      await fireEvent.input(screen.getByRole('textbox', { name: answerLabel }), { target: { value: 'yes' } });
      await fireEvent.click(screen.getByRole('button', { name: 'Send answer' }));
      expect(answerElicitation).toHaveBeenCalledWith('brd_1', 'eli_1', { option: undefined, text: 'yes' });
    });

    it('an empty free answer says to type one', async () => {
      ok();
      mountQuestion(C, ask({ options: [] }));
      await fireEvent.click(screen.getByRole('button', { name: 'Send answer' }));
      expect(screen.getByRole('alert').textContent).toContain('Type an answer first.');
      expect(answerElicitation).not.toHaveBeenCalled();
    });

    if (o.decision === 'radio') {
      it('sending with nothing chosen says to pick one', async () => {
        ok();
        mountQuestion(C, ask());
        await fireEvent.click(screen.getByRole('button', { name: o.submit! }));
        expect(screen.getByRole('alert').textContent).toContain('Pick one of the options.');
        expect(answerElicitation).not.toHaveBeenCalled();
      });
    }

    it('holds the answer controls while an answer is in flight', async () => {
      let settle!: (r: unknown) => void;
      answerElicitation.mockReset().mockReturnValue(new Promise((r) => (settle = r)));
      mountQuestion(C, ask());
      await choose('Run the tests');
      await tick();
      const labels = o.decision === 'button' ? ['Run the tests', 'Skip them'] : [o.submit!];
      const controls = labels.map((n) => screen.getByRole('button', { name: n }));
      try {
        expectBusy(controls, busy, labels);
        if (busy.kind === 'aria') {
          await fireEvent.click(controls[controls.length - 1]);
          expect(answerElicitation, 'a click on a busy control is ignored').toHaveBeenCalledTimes(1);
        }
      } finally { settle({ ok: true, json: async () => ({}) }); }
      await tick();
    });

    it('holds Send answer while a free answer is in flight', async () => {
      let settle!: (r: unknown) => void;
      answerElicitation.mockReset().mockReturnValue(new Promise((r) => (settle = r)));
      mountQuestion(C, ask({ options: [] }));
      await fireEvent.input(screen.getByRole('textbox', { name: answerLabel }), { target: { value: 'yes' } });
      await fireEvent.click(screen.getByRole('button', { name: 'Send answer' }));
      await tick();
      try {
        expectBusy([screen.getByRole('button', { name: 'Send answer' })], busy, ['Send answer']);
      } finally { settle({ ok: true, json: async () => ({}) }); }
      await tick();
    });

    if (o.decision === 'button') {
      it('gives the first option the primary style, and not the second', () => {
        mountQuestion(C, ask());
        expect(screen.getByRole('button', { name: 'Run the tests' }).className).toMatch(PRIMARY);
        expect(screen.getByRole('button', { name: 'Skip them' }).className).not.toMatch(PRIMARY);
      });
    }

    it('shows a refusal beside the question', async () => {
      answerElicitation.mockReset().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: { message: 'Already answered' } }) });
      mountQuestion(C, ask());
      await choose('Run the tests');
      expect((await screen.findByRole('alert')).textContent).toBe('Already answered');
    });
  });
}
