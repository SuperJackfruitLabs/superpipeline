// apps/web/src/lib/components/workspace/capability-notes.test.ts
import { describe, expect, it } from 'vitest';
import type { AgentSummary, CapabilityRecord } from '$lib/api';
import { agentCountText, capsHeading, holdersOf, orphanNote, unstaffedNote } from './capability-notes';

const C = (key: string, agentCount: number, boardCount: number): CapabilityRecord => ({ id: `cap_${key}`, key, name: key, description: null, tags: [], examples: [], origin: 'declared', externalId: null, externalSource: null, inputModes: [], outputModes: [], agentCount, boardCount });
const A = (name: string, capabilities: string[]) => ({ id: `agt_${name}`, name, capabilities }) as AgentSummary;

describe('capability notes', () => {
  it('names an orphan capability and links to the board settings', () => {
    expect(orphanNote(C('command', 1, 0), ['super-chotu'], 'brd_134a0ddb6d434478')).toEqual({
      key: 'command', text: 'is held by super-chotu but no board stage asks for it, so it lets that agent claim nothing.',
      link: { label: 'Add a stage that asks for it', href: '/b/brd_134a0ddb6d434478/settings' }, tail: ' or remove it.',
    });
    expect(orphanNote(C('x', 3, 0), ['a', 'b', 'c'], null).text).toBe('is held by a, b and c but no board stage asks for it, so it lets them claim nothing.');
    expect(orphanNote(C('x', 2, 0), ['a', 'b'], null).link.href).toBe('/');
  });
  it('names an unstaffed capability and links to the agents', () => {
    expect(unstaffedNote(C('design', 0, 2))).toEqual({ key: 'design', text: 'is asked for by 2 boards but no agent holds it, so cards there wait for ever.', link: { label: 'Give it to an agent', href: '/crew/agents' }, tail: '.' });
    expect(unstaffedNote(C('design', 0, 1)).text).toBe('is asked for by 1 board but no agent holds it, so cards there wait for ever.');
  });
  it('counts', () => {
    expect(capsHeading(19)).toBe('19 capabilities');
    expect(capsHeading(1)).toBe('1 capability');
    expect([agentCountText(2), agentCountText(1), agentCountText(0)]).toEqual(['2 agents', '1 agent', 'No agent']);
  });
  it('lists holders in the agents’ own order', () => {
    const agents = [A('predictor-paul', ['analysis']), A('coder-kai', ['code']), A('analyst-echo', ['analysis', 'claim-check'])];
    expect(holdersOf(C('analysis', 2, 1), agents).map((a) => a.name)).toEqual(['predictor-paul', 'analyst-echo']);
  });
});
