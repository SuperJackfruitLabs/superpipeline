// apps/web/src/lib/components/dialogs/MoveCardDialog.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import MoveCardDialog from './MoveCardDialog.svelte';
import { app } from '$lib/stores/app.svelte';

const card = {
  id: 'crd_1', title: 'Launch post', currentStageKey: 'b', state: 'submitted', priority: 0, costUsd: 0, overBudget: false, attemptCount: 0,
  labels: [], blockedBy: [], archivedAt: null, parentCardId: null, openChildCount: 0, costUsdRollup: 0, dueAt: null, projectId: null, milestoneId: null,
  ownerUserId: 'usr_1', queuedBy: null, delegateAgentId: null, lastAgentId: null, stageSince: '2026-10-11T08:00:00Z', createdAt: '2026-10-11T08:00:00Z',
};
const moveCard = vi.fn(async () => { app.error = null; });

beforeEach(() => {
  app.boardId = 'brd_1';
  app.board = {
    boardId: 'brd_1', name: 'Launch', cards: [card], gates: [], elicitations: [], references: [],
    stages: [{ key: 'a', name: 'Plan', order: 0, ownerKind: 'human' }, { key: 'b', name: 'Build', order: 1, ownerKind: 'human' }, { key: 'c', name: 'Review', order: 2, ownerKind: 'human', gate: 'approval' }],
    usage: { totalCostUsd: 0, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: null, overBudget: false },
  } as never;
  app.agents = []; app.members = []; app.error = null;
  moveCard.mockClear();
  app.moveCard = moveCard as never;
});
afterEach(() => { cleanup(); app.closeMoveDialog(); });

describe('MoveCardDialog', () => {
  it('opens on the next stage, with the current stage disabled and marked', async () => {
    render(MoveCardDialog);
    app.openMoveDialog('crd_1');
    await tick(); await tick();
    const d = screen.getByRole('dialog', { name: 'Launch post' });
    expect(d.classList.contains('vk-dialog')).toBe(true);
    expect(screen.getByText('Move card')).toBeTruthy();
    const here = screen.getByRole('radio', { name: /^Build/ }) as HTMLInputElement;
    expect(here.disabled).toBe(true);
    expect(screen.getByText('Here now')).toBeTruthy();
    expect((screen.getByRole('radio', { name: /^Review/ }) as HTMLInputElement).checked).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: /^Review/ }));
    expect(screen.getByRole('button', { name: 'Move to Review' })).toBeTruthy();
    expect(screen.getByText('In Review: It waits here for a person to approve before it can ship.')).toBeTruthy();
  });
  it('moves to the picked stage and closes', async () => {
    render(MoveCardDialog);
    app.openMoveDialog('crd_1');
    await tick();
    await fireEvent.click(screen.getByRole('radio', { name: /^Plan/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Move to Plan' }));
    await tick();
    expect(moveCard).toHaveBeenCalledWith('crd_1', 'a');
    expect(app.moveCardId).toBeNull();

  });
  it('stays open and says why when the move is refused', async () => {
    moveCard.mockImplementationOnce(async () => { app.error = 'Review is at its limit of 1 card.'; });
    render(MoveCardDialog);
    app.openMoveDialog('crd_1');
    await tick();
    await fireEvent.click(screen.getByRole('button', { name: 'Move to Review' }));
    await tick();
    expect(screen.getByRole('alert').textContent).toBe('Review is at its limit of 1 card.');
    expect(app.moveCardId).toBe('crd_1');
  });
});
