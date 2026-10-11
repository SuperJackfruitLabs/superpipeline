// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import StageList from './StageList.svelte';

afterEach(cleanup);

const stages = [
  { key: 'a', name: 'Plan', order: 0, count: 0, wipLimit: null, atLimit: false, blocked: 0, gate: false, manager: false, owner: { kind: 'capability', label: 'plan', declaredBy: ['Sample agent'], undeclared: false, caveat: '' }, empty: true },
  { key: 'b', name: 'Build', order: 1, count: 2, wipLimit: 2, atLimit: true, blocked: 1, gate: true, manager: true, owner: { kind: 'capability', label: 'code', declaredBy: [], undeclared: true, caveat: 'Nobody declares it, but an implication may qualify one.' }, empty: false },
] as never;

describe.each(['lines', 'strip', 'table'] as const)('StageList %s', (variant) => {
  it('shows every stage fact', () => {
    render(StageList, { stages, variant });
    expect(screen.getByText('Plan')).toBeTruthy();
    expect(screen.getByText('Build')).toBeTruthy();
    expect(screen.getByText('empty')).toBeTruthy();
    expect(screen.getByText('plan')).toBeTruthy();
    const count = screen.getByText('2/2');
    expect(count.className).toContain('text-signal-text');
    const blocked = screen.getByText('⛔ 1 blocked');
    expect(blocked.getAttribute('title')).toBe('1 of 2 cards here is blocked — held back by an unresolved same-board blocker, excluded from claim');
    expect(screen.getByText('gate').getAttribute('title')).toBe('Approval gate');
    expect(screen.getByText('mgr').getAttribute('title')).toBe('Manager routing');
    const owner = screen.getByText('⚠ code — nobody declares it');
    expect(owner.getAttribute('title')).toBe('Nobody declares it, but an implication may qualify one.');
  });

  it('shows a plain count under the limit, and who declares a capability', () => {
    render(StageList, { stages: [{ ...(stages as unknown as object[])[0], count: 1, empty: false, wipLimit: 3 }] as never, variant });
    expect(screen.getByText('1/3').className).toContain('text-muted-foreground');
    expect(screen.getByText('· Sample agent')).toBeTruthy();
    expect(screen.queryByText('empty')).toBeNull();
  });
});

describe('StageList strip scrolls by keyboard', () => {
  it('is focusable so a sideways-scrolling strip can be reached', () => {
    const { container } = render(StageList, { stages: [], variant: 'strip' } as never);
    expect(container.querySelector('ol')!.getAttribute('tabindex')).toBe('0');
  });
});
