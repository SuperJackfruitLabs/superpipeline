/**
 * One project, for its page and its drawer (nav v2, N2): the record and its milestones, the
 * roll-up snapshot, and what the page derives from its cards across boards (`project-detail.ts`).
 */
import { app } from '$lib/stores/app.svelte';
import { displayAgent } from '$lib/names';
import {
  createMilestone, deleteMilestone, deleteProject, getProject, getProjectRollup, updateMilestone, updateProject,
  type Milestone, type Project, type ProjectRollup,
} from '$lib/api';
import {
  agentsOn, blockersOf, cardsByBoard, computedHealth, milestoneStatus, spendByBoard, todayIso, type MilestoneStatus,
} from './project-detail';
import { projectWorkspace } from './project-workspace.svelte';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
async function refusal(res: Response, fallback: string): Promise<string | null> {
  if (res.ok) return null;
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `${fallback} (${res.status})`;
}

export class ProjectPageModel {
  readonly id: string;
  project = $state<Project | null>(null);
  milestones = $state<Milestone[]>([]);
  rollup = $state<ProjectRollup | null>(null);
  rollupError = $state<string | null>(null);
  rollupBusy = $state(false);
  loading = $state(true);
  notFound = $state(false);
  /** The project could not be read (5xx, network, timeout): the page says so with Try again, never "no longer exists". */
  loadFailed = $state(false);
  error = $state<string | null>(null);
  busy = $state(false);

  constructor(id: string) {
    this.id = id;
  }

  readonly today = todayIso();
  /** The cards across boards are still being read: counts wait ("–"), "No cards yet" waits. */
  get cardsPending(): boolean { return !projectWorkspace.loaded; }
  /** The Activity is still being read. */
  get activityPending(): boolean { return !projectWorkspace.eventsFor[this.id]; }
  get cards() { return projectWorkspace.cardsOf(this.id); }
  get boards() { return projectWorkspace.boardsOf(this.id); }
  get health() { return this.project ? computedHealth(this.project, this.milestones, this.cards, this.today) : null; }
  get blockers() { return blockersOf(this.cards, app.agents, Date.now()); }
  get groups() { return cardsByBoard(this.cards); }
  get agents() { return agentsOn(this.cards, app.agents); }
  get spend() { return spendByBoard(this.cards); }
  get activity() { return projectWorkspace.activityOf(this.id); }
  get doneCount() { return this.cards.filter((c) => c.card.state === 'completed').length; }
  agentName(id: string): string { return displayAgent(id, app.agents); }
  statusOf(m: Milestone): MilestoneStatus { return milestoneStatus(m, this.cards, this.today); }
  cardsIn(m: Milestone) { return this.cards.filter((c) => c.card.milestoneId === m.id); }

  async load(): Promise<void> {
    this.loading = true;
    const read = Promise.all([this.#readProject(), projectWorkspace.load(), this.refreshRollup()]);
    app.markBusy(read);
    await read;
    this.loading = false;
    if (this.project) void projectWorkspace.loadEvents(this.id);
  }

  async #readProject(): Promise<void> {
    try {
      const got = await getProject(this.id);
      if (!got) { this.notFound = true; return; }
      this.project = got.project;
      this.milestones = got.milestones;
      this.loadFailed = false;
    } catch {
      if (!this.project) this.loadFailed = true;
    }
  }

  async refreshRollup(): Promise<void> {
    this.rollupBusy = true;
    try {
      this.rollup = await getProjectRollup(this.id);
      this.rollupError = null;
    } catch {
      this.rollupError = 'try Refresh in a moment';
    } finally {
      this.rollupBusy = false;
    }
  }

  /** Reread after the dialog saved: the record, and the boards (a first milestone may be new). */
  async reload(): Promise<void> {
    await this.#readProject();
  }

  async addMilestone(name: string, targetDate: string): Promise<string | null> {
    const res = await createMilestone(this.id, { name: name.trim(), targetDate: targetDate || undefined, sortOrder: this.milestones.length });
    const no = await refusal(res, 'Couldn’t add that milestone');
    if (!no) await this.#readProject();
    return no;
  }

  async editMilestone(m: Milestone, name: string, targetDate: string): Promise<string | null> {
    const no = await refusal(await updateMilestone(m.id, { name: name.trim(), targetDate: targetDate || null }), 'Couldn’t save that milestone');
    if (!no) await this.#readProject();
    return no;
  }

  async removeMilestone(m: Milestone): Promise<string | null> {
    const no = await refusal(await deleteMilestone(m.id), `Couldn’t remove “${m.name}”`);
    if (!no) await this.#readProject();
    return no;
  }

  async complete(): Promise<void> {
    this.busy = true;
    try {
      this.error = await refusal(await updateProject(this.id, { state: 'completed' }), 'Couldn’t complete the project');
      if (!this.error) await this.#readProject();
    } finally {
      this.busy = false;
    }
  }

  /** True when it is gone. */
  async remove(): Promise<boolean> {
    this.busy = true;
    try {
      this.error = await refusal(await deleteProject(this.id), 'Couldn’t delete the project');
      return this.error === null;
    } finally {
      this.busy = false;
    }
  }
}
