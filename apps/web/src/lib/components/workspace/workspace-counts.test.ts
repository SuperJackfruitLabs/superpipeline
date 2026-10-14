// apps/web/src/lib/components/workspace/workspace-counts.test.ts
import { describe, expect, it } from 'vitest';
import { backLink, REVIEW_DESCRIPTION, WORKSPACE_DESCRIPTION } from './workspace-copy';
import { countsFrom, crewTabs, CREW_TAB_IDS } from './workspace-counts.svelte';

const ok = <T,>(value: T): PromiseSettledResult<T> => ({ status: 'fulfilled', value });
const no: PromiseSettledResult<never> = { status: 'rejected', reason: new Error('500') };

describe('workspace tabs', () => {
  it('Crew is Agents, People and Capabilities: no Needs you, no Labels, no Connections', () => {
    expect(CREW_TAB_IDS).toEqual(['agents', 'people', 'capabilities']);
    const c = countsFrom([ok(new Array(22)), ok(new Array(19)), ok(new Array(1))]);
    expect(crewTabs(c).map((t) => [t.label, t.count])).toEqual([['Agents', 22], ['People', 1], ['Capabilities', 19]]);
  });
  it('omits a count that failed to load', () => {
    const c = countsFrom([no, ok([]), no]);
    expect(crewTabs(c).map((t) => t.count)).toEqual([null, null, 0]);
  });
  it('says where the back link goes', () => {
    expect(backLink('brd_134a0ddb6d434478', 'Developer Experience')).toEqual({ href: '/b/brd_134a0ddb6d434478', label: 'Back to Developer Experience' });
    expect(backLink(null, null)).toEqual({ href: '/', label: 'Back to your boards' });
  });
  it('describes each tab', () => {
    expect(WORKSPACE_DESCRIPTION.agents).toBe("The agents that can claim cards on your boards. A card in a stage goes to an agent holding that stage's capability.");
    expect(REVIEW_DESCRIPTION).toBe('Every workspace tab, shown together for review: Needs you, Capabilities, Labels, People and Connections. (Agents has its own artboard.)');
  });
});
