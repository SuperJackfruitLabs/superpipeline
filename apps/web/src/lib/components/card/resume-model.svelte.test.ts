// @vitest-environment jsdom
// apps/web/src/lib/components/card/resume-model.svelte.test.ts
import { describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { resumeDraftKey, resumeShows, resumeTargets, ResumeModel } from './resume-model.svelte';
import { CARD_4605, STAGES_DX } from './testing/card-4605';

const resumeCard = vi.hoisted(() => vi.fn(async () => new Response('{}', { status: 200 })));
vi.mock('$lib/api', async (orig) => ({ ...(await orig<typeof import('$lib/api')>()), resumeCard }));

describe('resume targets', () => {
  it('lists every stage; this stage and earlier are allowed', () => {
    expect(resumeTargets(STAGES_DX, 'reproduce').map((t) => [t.key, t.n, t.current, t.allowed])).toEqual([
      ['reported', 1, false, true], ['reproduce', 2, true, true], ['test', 3, false, false], ['fix', 4, false, false],
      ['integrate', 5, false, false], ['signed-off', 6, false, false], ['shipped', 7, false, false],
    ]);
  });
  it('shows only for a stopped card with no gate, question or open child', () => {
    expect(resumeShows(CARD_4605, false, false)).toBe(true);
    expect(resumeShows(CARD_4605, true, false)).toBe(false);
    expect(resumeShows({ ...CARD_4605, state: 'working' }, false, false)).toBe(false);
    expect(resumeShows({ ...CARD_4605, openChildCount: 1 }, false, false)).toBe(false);
  });
});

describe('ResumeModel', () => {
  it('starts at the card’s stage even when the card arrives after its id (a card page loading its board)', () => {
    let card = $state<typeof CARD_4605 | null>(null);
    let m!: ResumeModel;
    const stop = $effect.root(() => {
      m = new ResumeModel(() => ({ boardId: 'brd_134a0ddb6d434478', card, stages: STAGES_DX, gatePending: false, questionPending: false, agentName: 'error-eric', after: async () => {} }));
      $effect(() => m.follow(CARD_4605.id));
    });
    flushSync();
    expect(m.target).toBe('');
    card = CARD_4605;
    flushSync();
    expect(m.target).toBe('reproduce');
    stop();
  });
  const make = () => {
    const after = vi.fn(async () => {});
    let m!: ResumeModel;
    const stop = $effect.root(() => { m = new ResumeModel(() => ({ boardId: 'brd_134a0ddb6d434478', card: CARD_4605, stages: STAGES_DX, gatePending: false, questionPending: false, agentName: 'error-eric', after })); m.follow(CARD_4605.id); });
    flushSync();
    return { m, after, stop };
  };
  it('refuses an empty note without a request, naming the agent', async () => {
    const { m, stop } = make();
    await m.submit();
    expect(m.error).toBe('Add a note for error-eric first.');
    expect(resumeCard).not.toHaveBeenCalled();
    expect(m.hint).toBe('Needed before you send. 0 / 8000');
    stop();
  });
  it('sends the note, to an earlier stage only when one is picked', async () => {
    const { m, after, stop } = make();
    expect(m.target).toBe('reproduce');
    m.note = 'Checked the DM logs.';
    await m.submit();
    expect(resumeCard).toHaveBeenLastCalledWith('brd_134a0ddb6d434478', CARD_4605.id, 'Checked the DM logs.', undefined);
    expect(after).toHaveBeenCalled();
    expect(m.note).toBe('');
    m.target = 'reported';
    m.note = 'Start over.';
    await m.submit();
    expect(resumeCard).toHaveBeenLastCalledWith('brd_134a0ddb6d434478', CARD_4605.id, 'Start over.', 'reported');
    stop();
  });
  it('shows the server’s refusal as the field error', async () => {
    resumeCard.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'Card is not stopped' } }), { status: 409 }));
    const { m, stop } = make();
    m.note = 'Go.';
    await m.submit();
    expect(m.error).toBe('Card is not stopped');
    stop();
  });
  it('keeps a half-typed note for this card across a reload (the reconnect sign-in), and forgets it once sent', async () => {
    sessionStorage.clear();
    const a = make();
    a.m.note = 'Half a thought';
    expect(sessionStorage.getItem(resumeDraftKey(CARD_4605.id))).toBe('Half a thought');
    a.stop();
    const b = make();
    expect(b.m.note).toBe('Half a thought');
    await b.m.submit();
    expect(b.m.note).toBe('');
    expect(sessionStorage.getItem(resumeDraftKey(CARD_4605.id))).toBeNull();
    b.stop();
  });
});
