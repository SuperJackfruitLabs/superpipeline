// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';

const { store } = vi.hoisted(() => ({ store: { openCard: vi.fn(), openMoveDialog: vi.fn(), moveCard: vi.fn(async () => {}), error: '', syncedAt: new Date('2026-10-11T08:21:00Z') } }));
vi.mock('$lib/stores/app.svelte', () => ({ app: store }));

import { DX, DX_IDS, boardCtx } from '$lib/test/fixture-boards';
import { buildBoardModel } from '../board-model';

import BoardDaylightPhone from './BoardDaylightPhone.svelte';

afterEach(cleanup);
const props = () => ({ model: buildBoardModel(DX, DX.cards, boardCtx()), vibe: 'daylight' as const, phase: 'noon' as const, onCompose: vi.fn() });

describe('BoardDaylightPhone', () => {
  it('puts the step chips first, with Needs you current', () => {
    render(BoardDaylightPhone, props());
    const nav = screen.getByRole('navigation', { name: 'Stages' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((a) => a.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Needs you 4', 'Reported 1', 'Reproduce 1', 'Failing test 3', 'Fix 1', 'Integrate 0', 'Signed off 0', 'Shipped 1',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#wants', '#stage-reported', '#stage-reproduce', '#stage-test', '#stage-fix', '#empty', '#empty', '#stage-shipped']);
    expect(links[0].getAttribute('aria-current')).toBe('true');
    expect(links[5].classList.contains('empty')).toBe(true);
  });

  it('moves aria-current to the chip that was followed', async () => {
    render(BoardDaylightPhone, props());
    const nav = screen.getByRole('navigation', { name: 'Stages' });
    await fireEvent.click(within(nav).getByRole('link', { name: 'Fix 1' }));
    expect(within(nav).getByRole('link', { name: 'Fix 1' }).getAttribute('aria-current')).toBe('true');
    expect(within(nav).getByRole('link', { name: 'Needs you 4' }).hasAttribute('aria-current')).toBe(false);
  });

  it('lists what wants you, most urgent first, then each stage lane', () => {
    render(BoardDaylightPhone, props());
    const wants = screen.getByRole('region', { name: 'Needs you 4' });
    expect(within(wants).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop',
      'AgentPod: connector interface and generic effects ledger, state machine and executor',
      'Superpipeline: manual-delivery completion and approval-subject hardening',
      'Fix the highest-severity blocker found in the clean-room journey',
    ]);
    expect(within(wants).getAllByRole('button', { name: /^(Resume|Open)$/ }).map((b) => b.textContent?.trim())).toEqual(['Resume', 'Resume', 'Resume', 'Open']);
    const failing = screen.getByRole('region', { name: /^Failing test 3/ });
    expect(within(failing).getByText('1 card is waiting on you above. 2 are queued here.')).toBeTruthy();
    expect(within(failing).getByText('Blocked by 3 cards').getAttribute('title')).toBe('Waits on 3 cards: agentpod-connectors: X connector (connector x); AgentPod: connector interface and generic effects ledger, state machine and executor; Superpipeline: manual-delivery completion and approval-subject hardening');
    const empties = screen.getByRole('region', { name: 'Empty stages · 2' });
    expect(within(empties).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Integrate · integration', 'Signed off · gate · approval by a person']);
  });

  it('sentence-cases the agent text and opens the Move dialog on M', async () => {
    render(BoardDaylightPhone, props());
    expect(screen.getByText(/^This stage was not finished twice — .*missing commit\.$/)).toBeTruthy();
    const title = screen.getByRole('button', { name: /^AgentPod: connector interface.*Enter to open, M to move/ });
    await fireEvent.keyDown(title, { key: 'm' });
    await tick();
    expect(store.openMoveDialog).toHaveBeenCalled(); // the Move dialog (SP-Dlg-Move) opens, not a menu
  });

  it('opens a card from its action and opens the Move dialog', async () => {
    render(BoardDaylightPhone, props());
    const wants = screen.getByRole('region', { name: 'Needs you 4' });
    await fireEvent.click(within(wants).getAllByRole('button', { name: 'Resume' })[0]!);
    expect(store.openCard).toHaveBeenCalledWith(DX_IDS.c4605);
    await fireEvent.click(within(wants).getAllByRole('button', { name: /^Move .* to another stage$/ })[0]!);
    await tick();
    expect(store.openMoveDialog).toHaveBeenCalledWith(DX_IDS.c4605);
  });
});
