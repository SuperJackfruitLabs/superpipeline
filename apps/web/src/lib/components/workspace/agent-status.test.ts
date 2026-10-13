// apps/web/src/lib/components/workspace/agent-status.test.ts
import { describe, expect, it } from 'vitest';
import type { AgentSummary, CapabilityRecord } from '$lib/api';
import { agentsHeading, agentsPanelMeta, agentStatus, bannerTitle, chipKeys, isUnusedCap, moreTokens, tokensInUse, tokensLabel } from './agent-status';

const A = (name: string, over: Partial<AgentSummary> = {}): AgentSummary => ({
  id: `agt_fx_${name.replace(/-/g, '_')}`, name, capabilities: [], externalId: `prn_${name}`, externalSource: 'agentpod',
  iconUrl: null, concurrency: 1, tokenIds: ['tok_1', 'tok_2'], role: null, claimedCount: 0, workingCount: 0, ...over,
});
const C = (key: string, boardCount = 1): CapabilityRecord => ({
  id: `cap_${key}`, key, name: key, description: null, tags: [], examples: [], origin: 'declared', externalId: null, externalSource: null,
  inputModes: [], outputModes: [], agentCount: 1, boardCount,
});

describe('agent status', () => {
  it('says what an agent is doing from its claimed and working counts', () => {
    expect(agentStatus(A('research-ray'))).toEqual({ mood: 'resting', line: 'Resting · nothing claimed' });
    expect(agentStatus(A('tester-tim', { claimedCount: 1 }))).toEqual({ mood: 'thinking', line: 'Holding 1 card' });
    expect(agentStatus(A('coder-kai', { claimedCount: 2 })).line).toBe('Holding 2 cards');
    expect(agentStatus(A('coder-kai', { claimedCount: 3, workingCount: 1 }))).toEqual({ mood: 'working', line: 'Working · 3 claimed' });
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
