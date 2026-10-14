// apps/web/src/lib/components/plan/projects/ProjectsPage.svelte.test.ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';

const api = vi.hoisted(() => ({
  listProjects: vi.fn(), getProject: vi.fn(), getProjectRollup: vi.fn(), createProject: vi.fn(),
  deleteProject: vi.fn(), createMilestone: vi.fn(), deleteMilestone: vi.fn(),
  getBoards: vi.fn(), getBoard: vi.fn(), getBoardEvents: vi.fn(),
}));
vi.mock('$lib/api', () => api);
vi.mock('$lib/stores/app.svelte', () => ({ app: { board: { name: 'Developer Experience' }, boards: [], projects: [], markBusy: <T,>(p: Promise<T>) => p } }));

import ProjectsPage from './ProjectsPage.svelte';
import { ProjectsModel } from '../projects-model.svelte';

const guild = { id: 'prj_23b93f2d16d54b27', tenantId: 'tnt_vibes', name: 'Guild — Forge workspaces and checkpoint recovery', description: null, targetDate: null, state: 'active', health: null, leadUserId: null, createdAt: '2026-09-01T00:00:00Z', updatedAt: null };

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.listProjects.mockResolvedValue([guild]);
  api.getProject.mockResolvedValue({ project: guild, milestones: [] });
  api.getBoards.mockResolvedValue([{ id: 'brd_a' }, { id: 'brd_b' }, { id: 'brd_c' }]);
  const snap = (boardId: string, name: string, projectId: string | null) => ({ boardId, name, stages: [], cards: [{ id: `card_${boardId}`, title: 't', projectId, archivedAt: null, currentStageKey: 'x' }] });
  api.getBoard.mockImplementation(async (id: string) => (id === 'brd_a' ? snap(id, 'Developer Experience', guild.id) : id === 'brd_b' ? snap(id, 'Platform Operations', guild.id) : snap(id, 'Client Quality', null)));
});
afterEach(cleanup);

async function mount(): Promise<ProjectsModel> {
  const model = new ProjectsModel();
  await model.refresh();
  render(ProjectsPage, { model, vibe: 'daylight' });
  return model;
}

describe('ProjectsPage loading and failure', () => {
  it('says nothing about "no projects" while the list is still being read', async () => {
    api.listProjects.mockReturnValue(new Promise(() => {}));
    const model = new ProjectsModel();
    void model.refresh();
    render(ProjectsPage, { model, vibe: 'daylight' });
    expect(model.pending).toBe(true);
    expect(document.body.textContent).not.toMatch(/No projects yet/);
    expect(document.querySelector('[aria-busy="true"][data-skeleton]')).not.toBeNull();
  });
  it('a failed read says it could not load, with Try again, never "No projects yet"', async () => {
    api.listProjects.mockRejectedValue(new Error('listProjects failed (500)'));
    const model = new ProjectsModel();
    await model.refresh();
    render(ProjectsPage, { model, vibe: 'daylight' });
    expect(screen.getByText("Couldn't load projects.")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/No projects yet|failed \(500\)/);
    api.listProjects.mockResolvedValue([guild]);
    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(guild.name)).toBeTruthy();
  });
});

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
    const line = await screen.findByText('Rollup unavailable — try again in a moment');
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
  it('names the boards its cards live on, and New project opens the dialog', async () => {
    api.getProjectRollup.mockReturnValue(new Promise(() => {}));
    const model = await mount();
    const row = (await screen.findByText('Platform Operations')).closest('.pboards')!;
    expect(row.textContent).toBe('Cards onDeveloper ExperiencePlatform Operations');
    expect(screen.getByRole('link', { name: guild.name }).getAttribute('href')).toBe(`/plan/projects/${guild.id}`);
    expect(screen.queryByRole('button', { name: 'Create' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    expect(model.dialogOpen).toBe(true);
  });
  it('a plain click on a project opens it in the drawer', async () => {
    api.getProjectRollup.mockReturnValue(new Promise(() => {}));
    const model = await mount();
    await fireEvent.click(screen.getByRole('link', { name: guild.name }));
    expect(model.drawerId).toBe(guild.id);
  });
});
