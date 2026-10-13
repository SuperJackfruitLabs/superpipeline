// apps/web/src/lib/components/card/quiet-words.test.ts
import { describe, expect, it } from 'vitest';
import { quietAgentPage, quietAskedBy, quietAttempts, quietCost, quietHistoryHead, quietHistoryLine, quietPageMeta, quietResumeOption, quietRow, quietSubtasks, quietWho, whenLong } from './quiet-words';
import { ACTIVITIES_4605, ATTEMPTS_4605, TZ } from './testing/card-4605';

const names = (id: string) => ({ agt_fx_error_eric: 'error-eric' } as Record<string, string>)[id] ?? id;

describe('Quiet words (4605)', () => {
  it('times and the who line', () => {
    expect(whenLong('2026-10-08T14:11:45Z', TZ)).toBe('Thursday 8 October at 19:41');
    expect(quietWho('stopped', 'error-eric', '2026-10-08T14:11:45Z', TZ)).toBe('error-eric stopped on Thursday 8 October at 19:41 and wrote:');
    expect(quietWho('failed', 'error-eric', '2026-10-08T14:11:45Z', TZ)).toBe('error-eric failed on Thursday 8 October at 19:41 and wrote:');
  });
  it('the meta line and the people', () => {
    expect(quietPageMeta({ state: 'Waiting on you', ageHours: 66.15, i: 1, n: 7, stage: 'Reproduce', attempt: 2, priority: 3, due: null, labels: [] }))
      .toBe('Waiting on you for 2 days · Stage 2 of 7: Reproduce · Attempt 2 · Priority P3 · No due date · No labels');
    expect(quietAgentPage('error-eric', 2, 'Reproduce', null)).toBe('None holding it. error-eric ran attempt 2 of Reproduce.');
    expect(quietAgentPage('error-eric', 2, 'Reproduce', 'coder-kai')).toBe('coder-kai is working it.');
    expect(quietAskedBy('super-chotu', true, true)).toBe('super-chotu, an agent allowed to dispatch the one working it');
    expect(quietResumeOption(2, 'Reproduce', true)).toBe('Stage 2: Reproduce (this stage)');
  });
  it('history, attempts, cost, sub-tasks', () => {
    expect(quietHistoryHead(2, 'Reproduce', 'error-eric')).toBe('Attempt 2, Reproduce, error-eric');
    expect(quietHistoryLine('stopped', ATTEMPTS_4605[1]!.endedAt, 14, 0, TZ)).toBe('Stopped at 19:41 on 8 October. 14 events, no errors.');
    expect(quietHistoryLine('sent back', ATTEMPTS_4605[0]!.endedAt, 9, 0, TZ)).toBe('Sent back at 12:11 on 8 October. 9 events, no errors.');
    const first = ACTIVITIES_4605.find((a) => a.runId === 'run_fx_4605_2' && a.seq === 1)!;
    const stop = ACTIVITIES_4605.find((a) => a.runId === 'run_fx_4605_2' && a.seq === 14)!;
    expect(quietRow(first, TZ)).toBe('18:50 Started Rework run on this card session; read prior persisted evidence first.');
    expect(quietRow(stop, TZ)).toBe('19:41 Stopped: Blocked. Waiting on you; the reason is shown at the top of this card.');
    expect(quietAttempts(ATTEMPTS_4605, names)).toBe('1: error-eric, $0.00, sent back. 2: error-eric, $0.00, stopped.');
    expect(quietCost(0, null)).toBe('$0.00, no estimate yet');
    expect(quietSubtasks(0, 0)).toBe('None (0 open of 0).');
    expect(quietSubtasks(1, 3)).toBe('3 sub-tasks (1 open of 3).');
  });
});
