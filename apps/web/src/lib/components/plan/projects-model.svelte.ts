import { app } from '$lib/stores/app.svelte';
import {
  listProjects, getProject, getProjectRollup, deleteProject, createMilestone, deleteMilestone,
  type Milestone, type Project, type ProjectRollup,
} from '$lib/api';
import { groupProjects, projectsSummary, type ProjectGroup } from './project-rollup';
import { projectWorkspace } from './project-workspace.svelte';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export class ProjectsModel {
  projects = $state<Project[]>([]);
  milestones = $state<Record<string, Milestone[]>>({});
  rollups = $state<Record<string, ProjectRollup>>({});
  rollupErrors = $state<Record<string, string>>({});
  loading = $state(true);
  loadError = $state<string | null>(null);

  /** Disclosure state lives here, so a layout re-mounted by a vibe change keeps what the person opened. */
  msOpen = $state<Record<string, boolean>>({});
  /** The New project dialog. */
  dialogOpen = $state(false);
  /** The project open in the drawer over the list, or null. */
  drawerId = $state<string | null>(null);
  deleting = $state<string | null>(null);

  msName = $state<Record<string, string>>({});
  msTarget = $state<Record<string, string>>({});
  addingFor = $state<string | null>(null);
  msError = $state<Record<string, string | null>>({});
  removingMs = $state<string | null>(null);

  groups: ProjectGroup[] = $derived(groupProjects(this.projects));
  /** Every project in the order the page draws them, so ids (`pj-0`…) count across groups. */
  ordered: Project[] = $derived(this.groups.flatMap((g) => g.projects));
  summary = $derived(projectsSummary(this.projects));
  /** The boards a project's cards live on (read once per visit, across every board). */
  boardsOf(id: string): Array<{ id: string; name: string }> { return projectWorkspace.boardsOf(id); }

  /** Projects and milestones gate the ready flag; rollups do not (the pixel harness holds them). */
  async refresh(): Promise<void> {
    this.loading = true;
    this.loadError = null;
    const listed = listProjects();
    app.markBusy(listed);
    try {
      this.projects = await listed;
      app.projects = this.projects;
    } catch (e) {
      this.loadError = message(e);
      this.loading = false;
      return;
    }
    for (const p of this.projects) void this.loadRollup(p.id);
    void projectWorkspace.load(true);
    const details = Promise.all(this.projects.map((p) => this.loadDetail(p.id)));
    app.markBusy(details);
    await details;
    this.loading = false;
  }

  async loadDetail(id: string): Promise<void> {
    const detail = await getProject(id);
    if (detail) this.milestones = { ...this.milestones, [id]: detail.milestones };
  }

  async loadRollup(id: string): Promise<void> {
    try {
      const r = await getProjectRollup(id);
      this.rollups = { ...this.rollups, [id]: r };
      const { [id]: _gone, ...rest } = this.rollupErrors;
      this.rollupErrors = rest;
    } catch (e) {
      this.rollupErrors = { ...this.rollupErrors, [id]: message(e) };
    }
  }

  async removeProject(p: Project): Promise<void> {
    if (!confirm(`Delete “${p.name}”? Its cards stay on their boards but will no longer show this project.`)) return;
    this.deleting = p.id;
    try {
      const res = await deleteProject(p.id);
      if (res.ok) await this.refresh();
      else this.loadError = `Couldn't delete “${p.name}” (${res.status})`;
    } finally {
      this.deleting = null;
    }
  }

  async addMilestone(projectId: string): Promise<void> {
    const name = (this.msName[projectId] ?? '').trim();
    if (name === '' || this.addingFor) return;
    this.addingFor = projectId;
    this.msError = { ...this.msError, [projectId]: null };
    try {
      const res = await createMilestone(projectId, { name, targetDate: (this.msTarget[projectId] ?? '').trim() || undefined });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        this.msError = { ...this.msError, [projectId]: body?.error ?? `Couldn't add that milestone (${res.status})` };
        return;
      }
      this.msName = { ...this.msName, [projectId]: '' };
      this.msTarget = { ...this.msTarget, [projectId]: '' };
      await this.loadDetail(projectId);
    } finally {
      this.addingFor = null;
    }
  }

  async removeMilestone(projectId: string, m: Milestone): Promise<void> {
    this.removingMs = m.id;
    try {
      const res = await deleteMilestone(m.id);
      if (res.ok) await this.loadDetail(projectId);
      else this.msError = { ...this.msError, [projectId]: `Couldn't remove “${m.name}” (${res.status})` };
    } finally {
      this.removingMs = null;
    }
  }
}
