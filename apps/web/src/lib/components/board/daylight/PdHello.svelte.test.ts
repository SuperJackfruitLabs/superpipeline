// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import { DX, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from '../board-model';
import PdHello from './PdHello.svelte';
afterEach(cleanup);

describe('PdHello', () => {
  it('greets, says what wants you and draws the crew with queuers resting', () => {
    render(PdHello, { props: { model: buildBoardModel(DX, DX.cards, boardCtx()), phase: 'noon', firstName: 'Ira' } });
    expect(screen.getByRole('heading', { level: 2, name: 'Good afternoon, Ira.' })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByText('4 cards want you.').tagName).toBe('STRONG');
    expect(screen.getByRole('region', { name: 'Greeting' }).textContent).toContain("Three agents stopped and one card waits in a person's stage.");
    const crew = screen.getByRole('list', { name: 'Agents on this board' });
    expect([...crew.querySelectorAll('[role="img"]')].map((f) => f.getAttribute('aria-label'))).toEqual([
      'tester-tim, needs you', 'coder-kai, needs you', 'error-eric, needs you', 'super-chotu, resting',
    ]);
    expect(screen.getByText('tester-tim, coder-kai and error-eric need you')).toBeTruthy();
  });
});
