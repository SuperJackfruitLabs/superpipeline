// apps/web/src/lib/components/dialogs/move-model.test.ts
import { describe, expect, it } from 'vitest';
import { AGENTS, DX_STAGES } from '../../../../e2e/pixel/fixture/dialog-cases';
import { dirLabel, initialPick, moveNowLead, moveThen, ownerFace, primaryLabel, stageCountText } from './move-model';

describe('move dialog model', () => {
  it('starts on the next stage, or the previous one at the end', () => {
    expect(initialPick(DX_STAGES, 'test')).toBe('fix');
    expect(initialPick(DX_STAGES, 'shipped')).toBe('signed-off');
  });
  it('counts each stage as the rows print it', () => {
    expect([[1, 0], [1, 0], [3, 2], [1, 0], [0, 0], [0, 0], [1, 0]].map(([c, b]) => stageCountText(c!, b!)))
      .toEqual(['1 card', '1 card', '3 cards · 2 blocked', '1 card', 'Empty', 'Empty', '1 card']);
  });
  it('labels direction from where the card is now', () => {
    expect([0, 1, 2, 3, 6].map((i) => dirLabel(i, 2))).toEqual(['back', 'back', '', 'forward', 'forward']);
  });
  it('says what the card is doing now', () => {
    expect(moveNowLead({ kind: 'stopped', ageHours: 33.4, agentName: 'tester-tim' })).toBe('tester-tim stopped 33h ago');
    expect(moveNowLead({ kind: 'stopped', ageHours: 66, agentName: 'error-eric' })).toBe('error-eric stopped 2d ago');
    expect(moveNowLead({ kind: 'working', ageHours: 1, agentName: 'coder-kai' })).toBe('coder-kai is working');
    expect(moveNowLead({ kind: 'question', ageHours: 1, agentName: 'research-ray' })).toBe('research-ray asked a question');
    expect(moveNowLead({ kind: 'review', ageHours: 1, agentName: null })).toBe('waiting for your review');
    expect(moveNowLead({ kind: 'done', ageHours: 1, agentName: null })).toBe('Done');
    expect(moveNowLead({ kind: 'idle', ageHours: null, agentName: null })).toBe('Queued');
  });
  it('says what happens in the picked stage, and names the button after it', () => {
    expect(moveThen(DX_STAGES.find((s) => s.key === 'fix')!, DX_STAGES, AGENTS)).toBe('In Fix: One of the 2 agents with code picks it up.');
    expect(primaryLabel('Fix', false)).toBe('Move to Fix');
    expect(primaryLabel('Fix', true)).toBe('Moving…');
  });
  it('draws a sole owner’s face, in the moved card’s mood only when it is that card’s agent', () => {
    const moved = { agentId: 'agt_fx_tester_tim', mood: 'needs' as const };
    expect(ownerFace(DX_STAGES[1]!, AGENTS, moved)).toEqual({ id: 'agt_fx_error_eric', name: 'error-eric', mood: 'resting' });
    expect(ownerFace(DX_STAGES[2]!, AGENTS, moved)).toEqual({ id: 'agt_fx_tester_tim', name: 'tester-tim', mood: 'needs' });
    expect(ownerFace(DX_STAGES[3]!, AGENTS, moved)).toBeNull();
  });
});
