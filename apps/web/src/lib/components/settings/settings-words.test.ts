// apps/web/src/lib/components/settings/settings-words.test.ts
import { describe, expect, it } from 'vitest';
import type { AgentSummary, Card } from '$lib/api';
import { ago, cardsHere, cardsPerStage, ghState, grantNote, ownerLabel, pipelineMeta, ruleLine, saveState, stageCards, unsavedCount, wipLine, worksBy } from './settings-words';
import { DX_STAGES, REPRODUCE_RULE } from './settings-fixture';

const card = (id: string, stage: string, archived = false) => ({ id, currentStageKey: stage, archivedAt: archived ? '2026-10-01T00:00:00Z' : null }) as Card;

describe('settings words', () => {
  it('says who works each stage', () => {
    expect(DX_STAGES.map((s) => ownerLabel(s, []))).toEqual([
      'A person', 'Agent with diagnostics', 'Agent with testing', 'Agent with code', 'Agent with integration or api or testing', 'A person', 'A person',
    ]);
    expect(ownerLabel({ key: 'x', name: 'X', order: 0, ownerKind: 'capability' }, [])).toBe('Agent with no capability set');
    expect(ownerLabel({ key: 'x', name: 'X', order: 0, ownerKind: 'capability', requires: { all: ['a', 'b'] } }, [])).toBe('Agent with a and b');
    expect(ownerLabel({ key: 'x', name: 'X', order: 0, ownerKind: 'agent', owner: 'agt_fx_tester_tim' }, [{ id: 'agt_fx_tester_tim', name: 'tester-tim' } as AgentSummary])).toBe('Agent tester-tim');
    expect(worksBy(DX_STAGES[0]!)).toBe('person');
    expect(worksBy(DX_STAGES[1]!)).toBe('agent');
  });
  it('counts live cards per stage, archived ones excluded', () => {
    const cards = [card('63ac', 'reported'), card('4605', 'reproduce'), card('4828', 'reproduce', true), card('58f8', 'test'), card('f83f', 'test'), card('481f', 'test'), card('1dfc', 'fix'), card('6281', 'integrate', true), card('9ed9', 'shipped')];
    expect(cardsPerStage(cards)).toEqual({ reported: 1, reproduce: 1, test: 3, fix: 1, shipped: 1 });
    expect([stageCards(1), stageCards(0), stageCards(3), cardsHere(1), cardsHere(2)]).toEqual(['1 card', '0 cards', '3 cards', '1 card here', '2 cards here']);
  });
  it('words the summary line', () => {
    expect(wipLine(undefined)).toBe('no WIP limit');
    expect(wipLine(2)).toBe('WIP limit 2');
    expect(ruleLine(DX_STAGES[1]!)).toBe(`Rule: ${REPRODUCE_RULE}`);
    expect(ruleLine({ ...DX_STAGES[1]!, instructions: '  two\n lines ' })).toBe('Rule: two lines');
    expect(ruleLine(DX_STAGES[2]!)).toBe('No standing rule');
    expect(pipelineMeta(7)).toBe('7 stages a card moves through, in order. Open a stage to edit it.');
  });
  it('counts unsaved stage changes, ignoring standing rules', () => {
    const draft = DX_STAGES.map((s) => ({ ...s }));
    expect(unsavedCount(draft, DX_STAGES)).toBe(0);
    expect(saveState(0)).toBe('Saved');
    draft[3] = { ...draft[3]!, wipLimit: 2 };
    expect(unsavedCount(draft, DX_STAGES)).toBe(1);
    expect(saveState(1)).toBe('1 unsaved change');
    expect(unsavedCount(DX_STAGES.map((s) => ({ ...s, instructions: 'changed' })), DX_STAGES)).toBe(0);
    expect(unsavedCount([DX_STAGES[1]!, DX_STAGES[0]!, ...DX_STAGES.slice(2)], DX_STAGES)).toBe(1);
    expect(unsavedCount(DX_STAGES.slice(0, 6), DX_STAGES)).toBe(1);
    expect(saveState(2)).toBe('2 unsaved changes');
  });
  it('says how long ago a rule was saved', () => {
    const t = Date.parse('2026-10-11T08:19:00Z');
    expect(ago(t, t + 120_000)).toBe('2 min ago');
    expect(ago(t, t + 30_000)).toBe('just now');
    expect(ago(t, t + 125 * 60_000)).toBe('2 h ago');
  });
  it('says where GitHub stands', () => {
    expect(ghState({ issueTrigger: false, webhookConfigured: false, triggerGrantCount: null, webhookUrl: '' })).toEqual({ text: 'Not set up', saved: false });
    expect(ghState({ issueTrigger: true, webhookConfigured: true, triggerGrantCount: 2, webhookUrl: '' })).toEqual({ text: 'Opening cards from issues', saved: true });
    expect(ghState({ issueTrigger: false, webhookConfigured: true, triggerGrantCount: null, webhookUrl: '' })).toEqual({ text: 'Connected · trigger off', saved: false });
    expect(grantNote(null)).toBe('Saving carries your dispatch authority onto every card this trigger opens. Without it, no agent can claim those cards.');
    expect(grantNote(1)).toBe('Cards from this trigger may be dispatched to 1 agent. Save again to refresh that.');
  });
});
