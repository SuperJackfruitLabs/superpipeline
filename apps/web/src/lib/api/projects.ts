/** Projects and milestones. */
import { ApiError } from '../loading';
import { fetch, headers } from './client';

/**
 * Projects and milestones (Task 18's `migration 0013`, `apps/api/src/db/projects.ts`) — a
 * project groups cards ACROSS boards, the same way a label does, and until this had no caller in
 * the web app at all. The envelopes below are read off `apps/api/src/index.ts` directly rather
 * than guessed, because this task shipped after the routes and the brief did not specify them.
 */
export type ProjectState = 'planned' | 'active' | 'paused' | 'completed' | 'canceled';

export type ProjectHealth = 'on-track' | 'at-risk' | 'off-track';

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  state: ProjectState;
  health: ProjectHealth | null;
  leadUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface Milestone {
  id: string;
  projectId: string;
  tenantId: string;
  name: string;
  targetDate: string | null;
  sortOrder: number;
  createdAt: string;
}

/**
 * A project's cross-board rollup (Task 19's `GET /v1/projects/:id/rollup`), cached in D1 for up
 * to 60 seconds and recomputed by fanning out to every board that carries this project's cards.
 *
 * `partial` and `boardsUnanswered` are deliberately NOT optional. When a board's Durable Object
 * does not answer, the server marks the whole total incomplete rather than quietly returning a
 * wrong number (`db/projects.ts`'s `computeRollup`) — and persists that admission, so a reader
 * served from the cache sees it too. Both fields are required here, not `?:`, so a caller cannot
 * destructure `cardsTotal`/`costUsd` out of this type without `partial`/`boardsUnanswered` also
 * being present on the value in hand: there is no narrower type that drops them to get at the
 * numbers. Rendering a total without reading them is still possible at the call site — this type
 * cannot force a render — but it cannot happen by the field being silently absent or typed away.
 */
export interface ProjectRollup {
  projectId: string;
  cardsTotal: number;
  cardsDone: number;
  cardsOverdue: number;
  costUsd: number;
  computedAt: string;
  partial: boolean;
  boardsUnanswered: number;
}

/** The workspace's projects. A refused read throws: a failure is never "no projects yet". */
export async function listProjects(): Promise<Project[]> {
  const res = await fetch('/v1/projects', { headers });
  if (!res.ok) throw new ApiError('listProjects', res.status);
  return ((await res.json()) as { projects: Project[] }).projects;
}

/**
 * One project and its milestones, already in `sortOrder` (the server's own order, `db/projects.ts`
 * `listMilestones`). Null for a 404 — a project id that no longer resolves is the expected shape
 * of a stale link, not a thrown error (see `Card.projectId`'s comment).
 */
export async function getProject(id: string): Promise<{ project: Project; milestones: Milestone[] } | null> {
  const res = await fetch(`/v1/projects/${id}`, { headers });
  // Null only when the project is not there for this person; a server failure throws (it is not "gone").
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new ApiError('getProject', res.status);
  return (await res.json()) as { project: Project; milestones: Milestone[] };
}

/**
 * Declare a project. Returns the raw response, like `createSchedule` does, so a caller can show
 * the server's own refusal verbatim — a 409 names the exact project the name collides with.
 */
export function createProject(input: {
  name: string;
  description?: string;
  targetDate?: string;
  leadUserId?: string;
  health?: ProjectHealth;
}): Promise<Response> {
  return fetch('/v1/projects', { method: 'POST', headers, body: JSON.stringify(input) });
}

export function updateProject(
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    targetDate: string | null;
    state: ProjectState;
    health: ProjectHealth | null;
    leadUserId: string | null;
  }>,
): Promise<Response> {
  return fetch(`/v1/projects/${id}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
}

/**
 * Delete a project, unconditionally — the route does not check for cards still carrying its id,
 * the same reasoning as `deleteLabel` (see the long comment on `deleteProject` in
 * `apps/api/src/db/projects.ts`). A card's `projectId` going stale afterwards is the expected
 * result, not a bug this call could have prevented.
 */
export function deleteProject(id: string): Promise<Response> {
  return fetch(`/v1/projects/${id}`, { method: 'DELETE', headers });
}

/** Add a milestone to a project. Returns the raw response so a caller can show a validation refusal. */
export function createMilestone(
  projectId: string,
  input: { name: string; targetDate?: string; sortOrder?: number },
): Promise<Response> {
  return fetch(`/v1/projects/${projectId}/milestones`, { method: 'POST', headers, body: JSON.stringify(input) });
}

/** Rename or re-date one milestone (`PATCH /v1/milestones/:id`). Raw response, like `createMilestone`. */
export function updateMilestone(milestoneId: string, patch: { name?: string; targetDate?: string | null }): Promise<Response> {
  return fetch(`/v1/milestones/${milestoneId}`, { method: 'PATCH', headers, body: JSON.stringify(patch) });
}

/** Remove one milestone, without deleting its project. */
export function deleteMilestone(milestoneId: string): Promise<Response> {
  return fetch(`/v1/milestones/${milestoneId}`, { method: 'DELETE', headers });
}

/**
 * The cached (or freshly computed) cross-board rollup for one project.
 *
 * **Throws on failure, like `getUsage` does, rather than returning zeros or a `partial: true`
 * placeholder.** A rollup the client invented to cover a failed fetch is exactly the dishonesty
 * `partial` exists to name when the SERVER could not complete it — inventing one locally on top
 * would undermine the same guarantee from the other direction.
 */
export async function getProjectRollup(projectId: string): Promise<ProjectRollup> {
  const res = await fetch(`/v1/projects/${projectId}/rollup`, { headers });
  if (!res.ok) throw new ApiError('getProjectRollup', res.status);
  return ((await res.json()) as { rollup: ProjectRollup }).rollup;
}
