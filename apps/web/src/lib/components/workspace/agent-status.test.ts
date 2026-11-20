// apps/web/src/lib/components/workspace/agent-status.test.ts
import { describe, expect, it } from 'vitest';
import type { AgentSummary, CapabilityRecord, StaleCard } from '$lib/api';
import { agentFrom, agentSeen, agentsHeading, agentsNeedingYou, agentsPanelMeta, agentState, agentStatus, agentWorks, bannerTitle, chipKeys, isUnusedCap, moreTokens, tokensInUse, tokensLabel } from './agent-status';

const A = (name: string, over: Partial<AgentSummary> = {}): AgentSummary => ({
  id: `agt_fx_${name.replace(/-/g, '_')}`, name, capabilities: [], externalId: `prn_${name}`, externalSource: 'agentpod',
  iconUrl: null, concurrency: 1, tokenIds: ['tok_1', 'tok_2'], role: null, claimedCount: 0, workingCount: 0, ...over,
});
const C = (key: string, boardCount = 1): CapabilityRecord => ({
  id: `cap_${key}`, key, name: key, description: null, tags: [], examples: [], origin: 'declared', externalId: null, externalSource: null,
  inputModes: [], outputModes: [], agentCount: 1, boardCount,
});

const stale = (agentId: string | null, why: StaleCard['why']): StaleCard => ({
  boardId: 'brd_134a0ddb6d434478', boardName: 'Developer Experience', cardId: 'card_1', title: 'Fix the flaky test', ownerUserId: 'usr_1',
  agentId, stageKey: 'fix', stageName: 'Fix', state: 'input-required', why, summary: null, since: '2026-11-18T00:00:00Z', ageHours: 1, next: '',
});

describe('agent status', () => {
  it('says what an agent is doing from its claimed and working counts', () => {
    expect(agentStatus(A('research-ray'))).toEqual({ mood: 'resting', line: 'Resting · nothing claimed' });
    expect(agentStatus(A('tester-tim', { claimedCount: 1 }))).toEqual({ mood: 'thinking', line: 'Holding 1 card' });
    expect(agentStatus(A('coder-kai', { claimedCount: 2 })).line).toBe('Holding 2 cards');
    expect(agentStatus(A('coder-kai', { claimedCount: 3, workingCount: 1 }))).toEqual({ mood: 'working', line: 'Working · 3 claimed' });
  });
  it('needs you only when the attention list names the agent, never for a card it just claimed', () => {
    const none = agentsNeedingYou([]);
    // One freshly claimed (submitted) card and nothing on the attention list: not "needs".
    expect(agentState(A('tester-tim', { claimedCount: 1 }), none)).toBe('resting');
    expect(agentState(A('coder-kai', { claimedCount: 2, workingCount: 1 }), none)).toBe('working');
    // A review item on a card the agent holds: needs you.
    const review = stale('agt_fx_strategy_sam', { kind: 'needs-human', reason: 'review' });
    const named = agentsNeedingYou([review]);
    expect(agentState(A('strategy-sam', { claimedCount: 1 }), named)).toBe('needs');
    expect(agentState(A('strategy-sam', { claimedCount: 1, workingCount: 1 }), named)).toBe('needs');
    expect(agentState(A('tester-tim', { claimedCount: 1 }), named)).toBe('resting');
  });
  it('reads the agents a question, refusal, repeated failure or block names; not sub-tasks or an unowned stage', () => {
    // The feed's reasons; not-authorised reads as a refusal. A failed run is a board-only row (no feed reason).
    const kinds = ['question', 'not-authorised', 'repeated-failure', 'blocked'] as const;
    expect(kinds.map((reason) => [reason, [...agentsNeedingYou([stale('agt_a', { kind: 'needs-human', reason })])]])).toEqual(kinds.map((reason) => [reason, ['agt_a']]));
    expect([...agentsNeedingYou([stale('agt_a', { kind: 'needs-human', reason: 'sub-tasks' })])]).toEqual([]);
    expect([...agentsNeedingYou([stale('agt_a', { kind: 'no-owner' })])]).toEqual([]);
    expect([...agentsNeedingYou([stale(null, { kind: 'needs-human', reason: 'review' })])], 'no agent holds it').toEqual([]);
  });
  it('words the agents table cells: works, from, last seen', () => {
    expect(agentWorks(A('a', { capabilities: ['planning', 'fix', 'integrate'] }))).toBe('planning, fix, integrate');
    expect(agentWorks(A('a'))).toBe('Nothing yet');
    expect(agentFrom(A('a'))).toBe('AgentPod');
    expect(agentFrom(A('a', { externalId: null, externalSource: null }))).toBe('This workspace');
    expect(agentSeen(A('a', { claimedCount: 1, workingCount: 1 }))).toBe('Now');
    expect(agentSeen(A('a'))).toBe('Not recorded');
  });
  it('heads the panel with links and work', () => {
    const fixture = Array.from({ length: 22 }, (_, i) => A(`agent-${i}`));
    expect(agentsPanelMeta(fixture)).toBe('All linked to AgentPod · none working right now');
    const five = [A('a', { workingCount: 1, claimedCount: 1 }), A('b', { workingCount: 1, claimedCount: 1 }), A('c'), A('d', { externalId: null }), A('e', { externalId: null })];
    expect(agentsPanelMeta(five)).toBe('3 of 5 linked to AgentPod · 2 working right now');
    expect(agentsPanelMeta([A('x', { externalId: null })])).toBe('None linked to AgentPod · none working right now');
    expect(agentsHeading(22)).toBe('22 agents');
    expect(agentsHeading(1)).toBe('1 agent');
  });
  it('counts tokens the way the rows and the menu print them', () => {
    expect(tokensLabel(5)).toBe('5 tokens');
    expect(tokensLabel(1)).toBe('1 token');
    expect(tokensInUse(5)).toBe('5 tokens in use');
    expect(tokensInUse(1)).toBe('1 token in use');
    expect(tokensInUse(0)).toBe('No tokens in use');
    expect(moreTokens(5)).toEqual({ more: 'and 3 more · ', link: 'show all 5' });
    expect(moreTokens(3)).toEqual({ more: 'and 1 more · ', link: 'show all 3' });
    expect(moreTokens(2)).toBeNull();
  });
  it('names a run-only token in the banner', () => {
    expect(bannerTitle('writer-quill')).toBe("writer-quill's token.");
    expect(bannerTitle('writer-quill', ['run'])).toBe("writer-quill's run-only token.");
    expect(bannerTitle('writer-quill', ['claim', 'run'])).toBe("writer-quill's token.");
  });
  it('orders chips by the registry, then keys added by hand, and marks the unused', () => {
    const reg = [C('analysis'), C('api'), C('claim-check'), C('command', 0)];
    expect(chipKeys(reg, ['claim-check', 'brand-new', 'analysis'])).toEqual(['analysis', 'api', 'claim-check', 'command', 'brand-new']);
    expect(isUnusedCap('command', reg)).toBe(true);
    expect(isUnusedCap('brand-new', reg)).toBe(true);
    expect(isUnusedCap('api', reg)).toBe(false);
  });
});
