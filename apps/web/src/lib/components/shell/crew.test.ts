// apps/web/src/lib/components/shell/crew.test.ts
import { describe, expect, it } from 'vitest';
import { crewCount, crewLine, crewOf, crewTitle } from './crew';
import { card, DX_AGENTS, DX_CARDS, DX_NEEDS } from './__fixtures__/dx';

describe('crew', () => {
  it('Developer Experience: three stopped agents in board order, then the queuer', () => {
    const crew = crewOf({ cards: DX_CARDS }, DX_AGENTS, DX_NEEDS);
    expect(crew.map((m) => [m.name, m.mood])).toEqual([
      ['tester-tim', 'needs'], ['coder-kai', 'needs'], ['error-eric', 'needs'], ['super-chotu', 'resting'],
    ]);
    expect(crewCount(crew)).toBe('4 agents');
    expect(crewLine(crew)).toBe('3 wait on you');
    expect(crewTitle(crew)).toBe('tester-tim, coder-kai and error-eric wait on you; super-chotu queues the work');
  });
  it('an empty board has no crew', () => {
    expect(crewOf({ cards: [] }, DX_AGENTS, new Set())).toEqual([]);
  });
  it('working agents follow the needs, and the line counts them when nobody waits', () => {
    const cards = [card({ id: 'card_w1', state: 'working', delegateAgentId: 'agt_fx_coder_kai', lastAgentId: 'agt_fx_coder_kai' })];
    const crew = crewOf({ cards }, DX_AGENTS, new Set());
    expect(crew.map((m) => [m.name, m.mood])).toEqual([['coder-kai', 'working']]);
    expect(crewLine(crew)).toBe('1 at work');
    expect(crewTitle(crew)).toBe('coder-kai is at work');
  });
  it('done, closed and archived cards bring nobody', () => {
    const cards = [
      card({ id: 'card_d', state: 'completed', lastAgentId: 'agt_fx_coder_kai' }),
      card({ id: 'card_a', state: 'input-required', archivedAt: '2026-10-09T14:21:02.650Z', lastAgentId: 'agt_fx_integration_ian' }),
    ];
    expect(crewOf({ cards }, DX_AGENTS, new Set(['card_a']))).toEqual([]);
    expect(crewLine([])).toBe('resting');
  });
});
