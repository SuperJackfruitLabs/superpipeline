// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

const api = vi.hoisted(() => ({ getProject: vi.fn(), getProjectRollup: vi.fn(), getBoard: vi.fn(), getBoardEvents: vi.fn() }));
vi.mock('$lib/api', async original => ({ ...await original<typeof import('$lib/api')>(), ...api }));
vi.mock('$lib/stores/app.svelte', () => ({ app: { boards: [{ id: 'brd_layout', name: 'Layout board' }], agents: [], projects: [], markBusy: <T,>(value: Promise<T>) => value } }));

import ProjectBody from './ProjectBody.svelte';
import { ProjectPageModel } from '../project-page-model.svelte';

afterEach(cleanup);

it('reveals the first project layout after its board reads settle, then retains it during roll-up refresh', async () => {
  let releaseBoard!: (value: unknown) => void;
  api.getBoard.mockImplementation(() => new Promise(resolve => { releaseBoard = resolve; }));
  api.getProject.mockResolvedValue({ project: { id: 'prj_layout', name: 'Stable project', state: 'active', health: null, targetDate: null, description: 'Project purpose' }, milestones: [] });
  api.getProjectRollup.mockResolvedValue({ cardsDone: 0, cardsTotal: 1, costUsd: 0, computedAt: new Date().toISOString(), partial: false, boardsUnanswered: 0 });
  api.getBoardEvents.mockResolvedValue([]);
  const model = new ProjectPageModel('prj_layout');
  const load = model.load();
  const { container } = render(ProjectBody, { model, ondeleted: () => {} });
  await waitFor(() => expect(model.project?.name).toBe('Stable project'));
  expect(container.querySelector('[data-skeleton][aria-busy="true"]')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Milestones' })).toBeNull();

  releaseBoard({ boardId: 'brd_layout', name: 'Layout board', stages: [{ key: 'ready', name: 'Ready' }], cards: [{ id: 'card_layout', projectId: 'prj_layout', title: 'Loaded project card', currentStageKey: 'ready', state: 'ready', blockedBy: [], costUsd: 0, archivedAt: null }] });
  await load;
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Stable project' })).toBeTruthy());
  expect(screen.getByRole('heading', { name: 'Milestones' })).toBeTruthy();
  expect(screen.getByText('Loaded project card')).toBeTruthy();

  let releaseRollup!: (value: unknown) => void;
  api.getProjectRollup.mockImplementation(() => new Promise(resolve => { releaseRollup = resolve; }));
  const loadedPage = container.querySelector('.pjb');
  const refresh = model.refreshRollup();
  await tick();
  expect(model.rollupBusy).toBe(true);
  expect(screen.getByRole('heading', { name: 'Milestones' })).toBeTruthy();
  expect(container.querySelector('.pjb')).toBe(loadedPage);
  releaseRollup({ cardsDone: 1, cardsTotal: 1, costUsd: 0, computedAt: new Date().toISOString(), partial: false, boardsUnanswered: 0 });
  await refresh;
});
