// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';

const api = vi.hoisted(() => ({ createProject: vi.fn(), updateProject: vi.fn(), createMilestone: vi.fn() }));
vi.mock('$lib/api', () => api);

import ProjectDialog from './ProjectDialog.svelte';

const made: import('$lib/api').Project = { id: 'prj_new', tenantId: 't', name: 'Clean-room fixes', description: null, targetDate: null, state: 'active', health: 'on-track', leadUserId: null, createdAt: '', updatedAt: null };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.createProject.mockResolvedValue(json({ project: made }, 201));
  api.updateProject.mockResolvedValue(json({ project: made }));
  api.createMilestone.mockResolvedValue(json({ milestone: {} }, 201));
});
afterEach(cleanup);

describe('ProjectDialog', () => {
  it('creates a project with its goal, date, declared health and a first milestone', async () => {
    const onsaved = vi.fn();
    render(ProjectDialog, { open: true, project: null, onsaved, onclose: () => {} });
    await tick();
    const d = screen.getByRole('dialog', { name: 'New project' });
    expect(d.classList.contains('vk-dialog')).toBe(true);
    const name = screen.getByRole('textbox', { name: 'Name' });
    expect(document.activeElement).toBe(name);
    const create = screen.getByRole('button', { name: 'Create project' });
    expect(create.getAttribute('aria-disabled')).toBe('true');
    await fireEvent.input(name, { target: { value: 'Clean-room fixes' } });
    await fireEvent.input(screen.getByRole('textbox', { name: /^Goal/ }), { target: { value: 'Every journey passes.' } });
    await fireEvent.input(screen.getByLabelText(/^Target date/), { target: { value: '2026-11-01' } });
    await fireEvent.click(screen.getByRole('radio', { name: 'At risk' }));
    await fireEvent.input(screen.getByRole('textbox', { name: 'Milestone' }), { target: { value: 'Kickoff' } });
    await fireEvent.input(screen.getByLabelText('Date'), { target: { value: '2026-10-20' } });
    await fireEvent.click(create);
    await vi.waitFor(() => expect(onsaved).toHaveBeenCalledWith('prj_new'));
    expect(api.createProject).toHaveBeenCalledWith({ name: 'Clean-room fixes', description: 'Every journey passes.', targetDate: '2026-11-01', health: 'at-risk' });
    expect(api.createMilestone).toHaveBeenCalledWith('prj_new', { name: 'Kickoff', targetDate: '2026-10-20' });
  });

  it('says the server’s refusal and stays open', async () => {
    api.createProject.mockResolvedValue(json({ error: 'a project named "X" already exists in this workspace' }, 409));
    const onsaved = vi.fn();
    render(ProjectDialog, { open: true, project: null, onsaved, onclose: () => {} });
    await tick();
    await fireEvent.input(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'X' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'a project named "X" already exists in this workspace');
    expect(onsaved).not.toHaveBeenCalled();
  });

  it('edits a project: titled Edit project, prefilled, Save patches it, no first milestone', async () => {
    const onsaved = vi.fn();
    render(ProjectDialog, { open: true, project: { ...made, description: 'Old goal', targetDate: '2026-11-01' }, onsaved, onclose: () => {} });
    await tick();
    expect(screen.getByRole('dialog', { name: 'Edit project' })).toBeTruthy();
    expect((screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value).toBe('Clean-room fixes');
    expect(screen.queryByRole('textbox', { name: 'Milestone' })).toBeNull();
    await fireEvent.input(screen.getByRole('textbox', { name: /^Goal/ }), { target: { value: 'New goal' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await vi.waitFor(() => expect(onsaved).toHaveBeenCalledWith('prj_new'));
    expect(api.updateProject).toHaveBeenCalledWith('prj_new', { name: 'Clean-room fixes', description: 'New goal', targetDate: '2026-11-01', health: 'on-track' });
  });
});
