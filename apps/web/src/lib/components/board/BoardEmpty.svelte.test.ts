// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { BOARD_EMPTY_FORMS } from '$lib/layouts';
import { ME, RELEASES, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from './board-model';
import BoardEmpty from './BoardEmpty.svelte';

afterEach(cleanup);
const props = (vibe: 'daylight' | 'paper' | 'studio' | 'quiet') => ({ model: buildBoardModel(RELEASES, RELEASES.cards, boardCtx()), intro: RELEASES.intro, form: BOARD_EMPTY_FORMS[vibe], me: { ...ME }, onCompose: vi.fn() });

describe('BoardEmpty', () => {
  it('says what the board does, step by step, and composes the first card', async () => {
    const p = props('daylight');
    const { container } = render(BoardEmpty, { props: p });
    expect(screen.getByRole('heading', { level: 2, name: 'No cards yet. Here is what this board does.' })).toBeTruthy();
    expect(container.querySelector('.em-lede')!.innerHTML).toContain('<b>proposal to production</b>');
    const flow = screen.getByRole('list', { name: 'Stages, in order' });
    expect([...flow.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['Proposed', 'Staged', 'Checks', 'Go / no-go', 'Released']);
    expect([...flow.querySelectorAll('li')].map((li) => li.classList.contains('gate'))).toEqual([false, false, false, true, false]);
    expect(screen.getByText('An approval gate. One release at a time waits here for your yes or no.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Change the stages in Board settings' }).getAttribute('href')).toBe('/b/brd_2441b5578f704b93/settings');
    await fireEvent.click(screen.getByRole('button', { name: 'Write the first card' }));
    expect(p.onCompose).toHaveBeenCalled();
  });
  it('adds no landmark and no h1: the shell owns both', () => {
    for (const v of ['daylight', 'paper', 'studio', 'quiet'] as const) {
      const { container } = render(BoardEmpty, { props: props(v) });
      expect(container.querySelector('main, h1, section, [role="region"], [aria-labelledby]')).toBeNull();
      cleanup();
    }
  });
  it('the per-stage card count is plain text, not a second label on a span', () => {
    const { container } = render(BoardEmpty, { props: props('paper') });
    expect([...container.querySelectorAll('.em-num')].some((n) => n.hasAttribute('aria-label'))).toBe(false);
    expect(container.querySelectorAll('.em-num')[1]!.textContent).toBe('0 cards');
  });
  it('a board with no stages draws one column, never repeat(0)', () => {
    const noStages = { ...RELEASES, stages: [], cards: [] };
    const { container } = render(BoardEmpty, { props: { ...props('daylight'), model: buildBoardModel(noStages, [], boardCtx()) } });
    expect((container.querySelector('.em-flow') as HTMLElement).style.getPropertyValue('--em-stages')).toBe('1');
    expect(container.querySelectorAll('.em-step')).toHaveLength(0);
  });
  it('Studio uses the kicker eyebrow and the Studio button', () => {
    const { container } = render(BoardEmpty, { props: props('studio') });
    expect(container.querySelector('p.em-eyebrow.kick')!.textContent).toBe('Production Releases');
    expect(container.querySelector('.em-cta button')!.className).toBe('ar-btn');
  });
  it('the other vibes use the pill and the vibekit button', () => {
    const { container } = render(BoardEmpty, { props: props('paper') });
    expect(container.querySelector('p.em-eyebrow span')!.textContent).toBe('Production Releases');
    expect(container.querySelector('.em-cta button')!.className).toContain('vk-button');
  });
});
