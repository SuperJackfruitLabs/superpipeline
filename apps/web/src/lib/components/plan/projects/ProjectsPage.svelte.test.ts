// apps/web/src/lib/components/plan/projects/ProjectsPage.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';

const api = vi.hoisted(() => ({
  listProjects: vi.fn(), getProject: vi.fn(), getProjectRollup: vi.fn(), createProject: vi.fn(),
  deleteProject: vi.fn(), createMilestone: vi.fn(), deleteMilestone: vi.fn(),
}));
vi.mock('$lib/api', () => api);
vi.mock('$lib/stores/app.svelte', () => ({ app: { board: { name: 'Developer Experience' }, projects: [], markBusy: <T,>(p: Promise<T>) => p } }));

import ProjectsPage from './ProjectsPage.svelte';
import { ProjectsModel } from '../projects-model.svelte';

const guild = { id: 'prj_23b93f2d16d54b27', tenantId: 'tnt_vibes', name: 'Guild — Forge workspaces and checkpoint recovery', description: null, targetDate: null, state: 'active', health: null, leadUserId: null, createdAt: '2026-09-01T00:00:00Z', updatedAt: null };

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.listProjects.mockResolvedValue([guild]);
  api.getProject.mockResolvedValue({ project: guild, milestones: [] });
});
afterEach(cleanup);

async function mount(): Promise<ProjectsModel> {
  const model = new ProjectsModel();
  await model.refresh();
  render(ProjectsPage, { model, vibe: 'daylight' });
  return model;
}

describe('ProjectsPage', () => {
  it('shows a busy skeleton while a rollup is outstanding', async () => {
    api.getProjectRollup.mockReturnValue(new Promise(() => {}));
    await mount();
    const busy = screen.getByText('Loading rollup…').parentElement!;
    expect(busy.getAttribute('aria-busy')).toBe('true');
  });
  it('says the rollup is unavailable, in muted text, when it fails', async () => {
    api.getProjectRollup.mockRejectedValue(new Error('rollup 500'));
    await mount();
    const line = await screen.findByText('Rollup unavailable — rollup 500');
    expect(line.className).toBe('t-meta');
    expect(document.querySelector('.bar')).toBeNull();
  });
  it('draws the loaded rollup with its provenance', async () => {
    api.getProjectRollup.mockResolvedValue({ projectId: guild.id, cardsTotal: 7, cardsDone: 2, cardsOverdue: 1, costUsd: 1.85, computedAt: '2026-10-11T08:21:00Z', partial: false, boardsUnanswered: 0 });
    await mount();
    expect(await screen.findByText('2/7 cards done')).toBeTruthy();
    expect(screen.getByText('$1.85')).toBeTruthy();
    expect(screen.getByText(/· 1 overdue$/)).toBeTruthy();
    expect((document.querySelector('.bar > i') as HTMLElement).style.width).toBe('29%');
  });
  it('enables Create only with a name, and Enter submits', async () => {
    api.getProjectRollup.mockReturnValue(new Promise(() => {}));
    api.createProject.mockResolvedValue(new Response('{}', { status: 201 }));
    await mount();
    const create = screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    const name = screen.getByLabelText('Project name');
    await fireEvent.input(name, { target: { value: 'Clean-room journey fixes' } });
    expect(create.disabled).toBe(false);
    await fireEvent.submit(name.closest('form')!);
    expect(api.createProject).toHaveBeenCalledWith({ name: 'Clean-room journey fixes', targetDate: undefined });
  });
});
