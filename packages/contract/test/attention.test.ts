import { describe, expect, it } from 'vitest';
import { needsYou } from '../src/attention';

const STAGES = [{ key: 'reported', ownerKind: 'human' }, { key: 'reproduce', ownerKind: 'capability' }, { key: 'signed-off', ownerKind: 'human', gate: 'approval' }];
const NOW = Date.parse('2026-10-11T08:21:00Z');
const ctx = { stages: STAGES, pendingGateCardIds: new Set<string>(), pendingQuestionCardIds: new Set<string>(), staleAfterHours: 24, nowMs: NOW };
const card = (over: Record<string, unknown>) => ({ id: 'card_x', state: 'submitted', archivedAt: null, currentStageKey: 'reproduce', stateSince: '2026-10-11T07:00:00Z', ...over });

describe('needsYou — the one rule every count uses', () => {
  it('a stopped card needs you', () => expect(needsYou(card({ state: 'input-required' }), ctx)).toBe(true));
  it('a queued card in a stage nobody works needs you once it has sat past the stale threshold', () => {
    expect(needsYou(card({ currentStageKey: 'reported', stateSince: '2026-10-08T09:51:01Z' }), ctx)).toBe(true);
    expect(needsYou(card({ currentStageKey: 'reported', stateSince: '2026-10-11T07:00:00Z' }), ctx)).toBe(false);
  });
  it('a board that switched stale cards off does not count them', () => {
    expect(needsYou(card({ currentStageKey: 'reported', stateSince: '2026-10-08T09:51:01Z' }), { ...ctx, staleEnabled: false })).toBe(false);
  });
  it('a queued card in a worked stage, a done card and an archived card do not', () => {
    expect(needsYou(card({}), ctx)).toBe(false);
    expect(needsYou(card({ state: 'completed' }), ctx)).toBe(false);
    expect(needsYou(card({ state: 'input-required', archivedAt: '2026-10-09T00:00:00Z' }), ctx)).toBe(false);
  });
  it('a pending gate or question needs you whatever the state', () => {
    expect(needsYou(card({ state: 'working' }), { ...ctx, pendingGateCardIds: new Set(['card_x']) })).toBe(true);
    expect(needsYou(card({ state: 'working' }), { ...ctx, pendingQuestionCardIds: new Set(['card_x']) })).toBe(true);
  });
  it('failed and over-budget cards need you', () => {
    expect(needsYou(card({ state: 'failed' }), ctx)).toBe(true);
    expect(needsYou(card({ overBudget: true }), ctx)).toBe(true);
  });
});
