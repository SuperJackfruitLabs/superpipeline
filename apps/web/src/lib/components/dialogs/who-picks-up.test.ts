// apps/web/src/lib/components/dialogs/who-picks-up.test.ts
import { describe, expect, it } from 'vitest';
import { AGENTS, DX_STAGES } from '../../../../e2e/pixel/fixture/dialog-cases';
import { dispatchFoot, joinCaps, ownerLine, ownerShort, pickupSentence, soleAgent } from './who-picks-up';

const at = (key: string) => DX_STAGES.find((s) => s.key === key)!;
const KEYS = ['reported', 'reproduce', 'test', 'fix', 'integrate', 'signed-off', 'shipped'];

describe('who picks a stage up', () => {
  it('names the owner briefly, as the stage picker options print it', () => {
    expect(DX_STAGES.map((s) => `${s.name} · ${ownerShort(s, AGENTS)}`)).toEqual([
      'Reported · a person', 'Reproduce · error-eric', 'Failing test · tester-tim', 'Fix · 2 agents',
      'Integrate · 3 agents', 'Signed off · approval gate', 'Shipped · a person',
    ]);
  });
  it('names the owner in full, as the Move rows print it', () => {
    expect(KEYS.map((k) => ownerLine(at(k), AGENTS))).toEqual([
      'a person', 'diagnostics · error-eric', 'testing · tester-tim', 'code · 2 agents',
      'integration or api or testing · 3 agents', 'a person · approval', 'a person',
    ]);
    expect(ownerLine({ key: 'x', name: 'X', order: 9, ownerKind: 'capability', owner: 'nobody-has-this' }, AGENTS)).toBe('nobody-has-this · no agent yet');
  });
  it('says what happens after a move, one sentence per kind of stage', () => {
    expect(KEYS.map((k) => pickupSentence(at(k), DX_STAGES, AGENTS))).toEqual([
      'A person picks it up here; no agent works this stage.',
      'error-eric picks it up.',
      'tester-tim picks it up.',
      'One of the 2 agents with code picks it up.',
      'One of the 3 agents with integration, api or testing picks it up.',
      'It waits here for a person to approve before it can ship.',
      'It lands with the finished work.',
    ]);
    expect(pickupSentence({ key: 'x', name: 'X', order: 3, ownerKind: 'capability', owner: 'nobody-has-this' }, DX_STAGES, AGENTS))
      .toBe('No agent declares nobody-has-this yet, so it waits here.');
  });
  it('writes the composer foot, with the stage name separable for <strong>', () => {
    const text = (k: string) => { const f = dispatchFoot(at(k), 'Developer Experience', AGENTS); return f.before + f.stage + f.after; };
    expect(text('reported')).toBe('Goes to Reported on Developer Experience, where a person picks it up.');
    expect(text('reproduce')).toBe('Goes to Reproduce on Developer Experience, where error-eric picks it up.');
    expect(text('fix')).toBe('Goes to Fix on Developer Experience, where one of the 2 agents with code picks it up.');
    expect(text('signed-off')).toBe('Goes to Signed off on Developer Experience, where a person approves it.');
    expect(dispatchFoot(at('reported'), 'Developer Experience', AGENTS)).toEqual({ before: 'Goes to ', stage: 'Reported', after: ' on Developer Experience, where a person picks it up.' });
  });
  it('finds the one agent that alone works a stage', () => {
    expect(soleAgent(at('reproduce'), AGENTS)?.name).toBe('error-eric');
    expect(soleAgent(at('fix'), AGENTS)).toBeNull();
    expect(soleAgent(at('reported'), AGENTS)).toBeNull();
  });
  it('joins capabilities the way a sentence does', () => {
    expect(joinCaps(['integration', 'api', 'testing'], 'any')).toBe('integration, api or testing');
    expect(joinCaps(['code', 'review'], 'all')).toBe('code and review');
    expect(joinCaps(['code'], 'any')).toBe('code');
  });
});
