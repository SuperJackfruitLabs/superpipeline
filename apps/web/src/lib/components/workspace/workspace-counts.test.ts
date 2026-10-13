// apps/web/src/lib/components/workspace/workspace-counts.test.ts
import { describe, expect, it } from 'vitest';
import { backLink, REVIEW_DESCRIPTION, WORKSPACE_DESCRIPTION } from './workspace-copy';
import { countsFrom, workspaceTabs } from './workspace-counts.svelte';

const ok = <T,>(value: T): PromiseSettledResult<T> => ({ status: 'fulfilled', value });
const no: PromiseSettledResult<never> = { status: 'rejected', reason: new Error('500') };

describe('workspace tabs', () => {
  it('counts the fixture the way the tab row prints it', () => {
    const c = countsFrom([ok({ cards: new Array(4), boardsUnanswered: 0 }), ok(new Array(22)), ok(new Array(19)), ok(new Array(3)), ok(new Array(1))]);
    expect(workspaceTabs(c).map((t) => [t.label, t.count, t.signal])).toEqual([
      ['Needs you', 4, true], ['Agents', 22, false], ['Capabilities', 19, false], ['Labels', 3, false], ['People', 1, false], ['Connections', null, false],
    ]);
  });
  it('omits a count that failed to load, and never shows a zero Needs-you pill', () => {
    const c = countsFrom([ok({ cards: [], boardsUnanswered: 0 }), no, ok([]), no, no]);
    expect(workspaceTabs(c).map((t) => t.count)).toEqual([null, null, 0, null, null, null]);
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
