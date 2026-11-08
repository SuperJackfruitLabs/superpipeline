import { beforeEach, describe, expect, it, vi } from 'vitest';
const answerElicitation = vi.fn();
vi.mock('$lib/api', () => ({ answerElicitation: (...a: unknown[]) => answerElicitation(...a) }));
import type { Elicitation } from '$lib/api';
import { QuestionAnswer } from './question-answer.svelte';

const ask = (options: Array<{ name: string; title: string }> = []) => ({ id: 'eli_1', options }) as never;

describe('QuestionAnswer', () => {
  let after: () => Promise<void>;
  let q: QuestionAnswer;
  let elicitation = ask([{ name: 'yes', title: 'Yes' }]);
  beforeEach(() => {
    answerElicitation.mockReset().mockResolvedValue({ ok: true, json: async () => ({}) });
    after = vi.fn(async () => {}) as () => Promise<void>;
    q = new QuestionAnswer(() => ({ boardId: 'brd_1', elicitation, after }));
  });

  it('an option goes back with the note', async () => {
    q.text = '  fine ';
    expect(await q.send('yes')).toBe(true);
    expect(answerElicitation).toHaveBeenCalledWith('brd_1', 'eli_1', { option: 'yes', text: 'fine' });
    expect(q.text).toBe('');
    expect(after).toHaveBeenCalled();
  });

  it('nothing picked and nothing typed is refused with the right sentence', async () => {
    expect(await q.send()).toBe(false);
    expect(q.error).toBe('Pick one of the options.');
    elicitation = ask([]);
    expect(await q.send()).toBe(false);
    expect(q.error).toBe('Type an answer first.');
    expect(answerElicitation).not.toHaveBeenCalled();
  });

  it('submit sends the selected option (the radio forms)', async () => {
    elicitation = ask([{ name: 'yes', title: 'Yes' }]);
    q.selected = 'yes';
    await q.submit();
    expect(answerElicitation).toHaveBeenCalledWith('brd_1', 'eli_1', { option: 'yes', text: undefined });
  });

  // Charter: strict decisions bind their subject §4. The board refuses an approval without the
  // binding, so the web app sends back the subject the person was shown.
  it('a question with a subject sends back its id and digest', async () => {
    const bound: Elicitation = {
      id: 'eli_2', cardId: 'crd_1', runId: 'run_1', stageKey: 'build', agentId: 'agt_a', question: 'Apply?', signal: 'select',
      options: [{ name: 'approve', title: 'Approve' }], status: 'pending', answer: null, createdAt: '2026-11-08T00:00:00.000Z',
      approvalSubject: { id: 'req_1', digest: 'a'.repeat(64), schema: 'salaam-operation/v1', revision: 1, expiresAt: null, preview: [], previewComplete: true },
    };
    q = new QuestionAnswer(() => ({ boardId: 'brd_1', elicitation: bound, after }));
    expect(await q.send('approve')).toBe(true);
    expect(answerElicitation).toHaveBeenCalledWith('brd_1', 'eli_2', { option: 'approve', text: undefined, subject: { id: 'req_1', digest: 'a'.repeat(64) } });
  });

  it('a refusal says what the server said', async () => {
    answerElicitation.mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: { message: 'Already answered' } }) });
    expect(await q.send('yes')).toBe(false);
    expect(q.error).toBe('Already answered');
  });

  it('a refusal without a message says the status', async () => {
    answerElicitation.mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error('x'); } });
    expect(await q.send('yes')).toBe(false);
    expect(q.error).toBe("Couldn't send that answer (500)");
  });

  it('a second send while one is in flight is ignored', async () => {
    let release!: (v: unknown) => void;
    answerElicitation.mockReturnValue(new Promise((r) => (release = r)));
    const first = q.send('yes');
    expect(await q.send('yes')).toBe(false);
    release({ ok: true, json: async () => ({}) });
    expect(await first).toBe(true);
    expect(answerElicitation).toHaveBeenCalledTimes(1);
    expect(q.answering).toBe(false);
  });

  it('a new question starts clean', () => {
    q.follow('eli_1');
    q.text = 'half';
    q.follow('eli_2');
    expect(q.text).toBe('');
  });
});
