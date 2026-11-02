// Projects and their milestones, which group cards across boards.
import { resolveUser, resolveHubUser } from '../auth/resolve';
import { projectSummaries } from '../board/stub';
import { listProjects, createProject, updateProject, deleteProject, projectById, listMilestones, createMilestone, deleteMilestone, milestoneById, updateMilestone, isProjectNameCollision, PROJECT_STATES, PROJECT_HEALTHS, computeRollup, cachedRollup, type ProjectState, type ProjectHealth } from '../db/projects';
import { refuseByRole, resolveWorkspaceCaller } from './callers';
import { unexpected } from './errors';
import { isInvalidDueAt } from './fields';
import type { WorkerRequest } from './router';

// /v1/projects[/:id[/milestones|/rollup]] — a workspace's projects (migration 0013), which
// group cards ACROSS boards. `GET /v1/projects/:id/rollup` (Task 19) is the one read in this
// module that fans out to every board's Durable Object, via `computeRollup` (`db/projects.ts`)
// — nothing else here touches a board.
export async function projects({ request, env }: WorkerRequest, projectsMatch: RegExpMatchArray): Promise<Response> {
  try {
    /**
     * A person, or a coordinator agent.
     *
     * `supi project ...` sends a hub JWT and never a session cookie, so `resolveUser` alone
     * cannot authenticate a person here — that fallback is unchanged. What is new is the agent:
     * reading a project is `read`, and creating or editing one is `plan`. DELETE stays a
     * person's, because a project is a record and removing one is not shaping work.
     *
     * The role check for a human is identical to before; it has simply moved into the helper.
     */
    const caller = await resolveWorkspaceCaller(request, env, {
      human: request.method === 'GET' ? 'read' : 'manage',
      agentScope:
        request.method === 'GET' ? 'read' : request.method === 'DELETE' ? null : 'plan',
    });
    if (caller instanceof Response) return caller;
    const { tenantId: wsTenantId, user: u } = caller;
    const projectId = projectsMatch[1];
    const subSeg = projectsMatch[2];

    if (request.method === 'GET' && !projectId) {
      return Response.json({ projects: await listProjects(env.DB, wsTenantId) });
    }

    if (request.method === 'GET' && projectId && subSeg === 'rollup') {
      // Same cross-tenant-reads-as-404 reasoning as the project read just below.
      if (!(await projectById(env.DB, wsTenantId, projectId))) {
        return Response.json({ error: 'project not found' }, { status: 404 });
      }
      // The cached row, reused inside 60s; recomputed (and re-cached) once it is older than
      // that. `computeRollup` is the one fan-out in this design — see its own comment in
      // `db/projects.ts` for why it is tenant-scoped and why `partial` exists at all.
      const cached = await cachedRollup(env.DB, wsTenantId, projectId);
      const STALE_MS = 60_000;
      const fresh = cached && Date.now() - new Date(cached.computedAt).getTime() < STALE_MS;
      const rollup = fresh ? cached! : await computeRollup(env.DB, projectSummaries(env), wsTenantId, projectId);
      return Response.json({ rollup });
    }

    if (request.method === 'GET' && projectId && !subSeg) {
      const project = await projectById(env.DB, wsTenantId, projectId);
      // A cross-tenant read answers 404, not 403: a 403 confirms the row exists under some
      // tenant, which is exactly the oracle that would let a caller enumerate another
      // tenant's project ids one guess at a time. `projectById` already scopes on
      // `tenant_id`, so "not mine" and "does not exist" are indistinguishable here, which is
      // the point — they must read the same to the caller too.
      if (!project) return Response.json({ error: 'project not found' }, { status: 404 });
      const milestones = await listMilestones(env.DB, wsTenantId, projectId);
      return Response.json({ project, milestones });
    }

    // Every write below is the same class of act as managing the workspace's capabilities or
    // labels.

    if (request.method === 'POST' && !projectId) {
      const body = (await request.json()) as {
        name?: string;
        description?: string;
        targetDate?: string;
        leadUserId?: string;
        health?: string | null;
      };
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name === '') return Response.json({ error: 'name is required' }, { status: 400 });
      if (isInvalidDueAt(body.targetDate)) {
        return Response.json({ error: 'targetDate must be YYYY-MM-DD' }, { status: 400 });
      }
      // Declared in the New project dialog, so a project is never created health-less by a
      // second request that could fail after the first succeeded.
      if (body.health != null && !PROJECT_HEALTHS.includes(body.health as ProjectHealth)) {
        return Response.json({ error: `unknown project health: "${body.health}"` }, { status: 400 });
      }
      try {
        const made = await createProject(env.DB, wsTenantId, {
          name,
          description: body.description ?? null,
          targetDate: body.targetDate ?? null,
          leadUserId: body.leadUserId ?? null,
          health: (body.health ?? null) as ProjectHealth | null,
        });
        return Response.json({ project: made }, { status: 201 });
      } catch (err) {
        if (!isProjectNameCollision(err)) throw err;
        return Response.json(
          { error: `a project named "${name}" already exists in this workspace` },
          { status: 409 },
        );
      }
    }

    if (request.method === 'PATCH' && projectId && !subSeg) {
      const body = (await request.json()) as {
        name?: string;
        description?: string | null;
        targetDate?: string | null;
        state?: string;
        health?: string | null;
        leadUserId?: string | null;
      };
      if (body.name !== undefined) {
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        if (name === '') return Response.json({ error: 'name is required' }, { status: 400 });
      }
      if (isInvalidDueAt(body.targetDate)) {
        return Response.json({ error: 'targetDate must be YYYY-MM-DD' }, { status: 400 });
      }
      if (body.state !== undefined && !PROJECT_STATES.includes(body.state as ProjectState)) {
        return Response.json({ error: `unknown project state: "${body.state}"` }, { status: 400 });
      }
      if (
        body.health !== undefined &&
        body.health !== null &&
        !PROJECT_HEALTHS.includes(body.health as ProjectHealth)
      ) {
        return Response.json({ error: `unknown project health: "${body.health}"` }, { status: 400 });
      }
      try {
        const updated = await updateProject(env.DB, wsTenantId, projectId, {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.targetDate !== undefined ? { targetDate: body.targetDate } : {}),
          ...(body.state !== undefined ? { state: body.state as ProjectState } : {}),
          ...(body.health !== undefined ? { health: body.health as ProjectHealth | null } : {}),
          ...(body.leadUserId !== undefined ? { leadUserId: body.leadUserId } : {}),
        });
        if (!updated) return Response.json({ error: 'project not found' }, { status: 404 });
        return Response.json({ project: updated });
      } catch (err) {
        if (!isProjectNameCollision(err)) throw err;
        const name = typeof body.name === 'string' ? body.name.trim() : '';
        return Response.json(
          { error: `a project named "${name}" already exists in this workspace` },
          { status: 409 },
        );
      }
    }

    if (request.method === 'DELETE' && projectId && !subSeg) {
      // Unconditional, the same way `deleteLabel` is (NOT `deleteCapability`, which refuses
      // with 409 when still used — it can, because a capability's references are entirely in
      // D1 and one cheap query finds them all). A card carrying this project's (or one of its
      // milestones') id lives in a board Durable Object this route cannot and must not reach,
      // so refusing while one might exist would mean exactly the cross-DO read the spec
      // forbids on a write path. See the comment on `deleteProject` in db/projects.ts for the
      // full reasoning.
      if (!(await deleteProject(env.DB, wsTenantId, projectId))) {
        return Response.json({ error: 'project not found' }, { status: 404 });
      }
      return new Response(null, { status: 204 });
    }

    if (request.method === 'POST' && projectId && subSeg === 'milestones') {
      const body = (await request.json()) as { name?: string; targetDate?: string; sortOrder?: number };
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name === '') return Response.json({ error: 'name is required' }, { status: 400 });
      if (isInvalidDueAt(body.targetDate)) {
        return Response.json({ error: 'targetDate must be YYYY-MM-DD' }, { status: 400 });
      }
      if (body.sortOrder !== undefined && typeof body.sortOrder !== 'number') {
        return Response.json({ error: 'sortOrder must be a number' }, { status: 400 });
      }
      // Checked here rather than caught from `createMilestone`'s own ownership throw, so an
      // unrelated failure (a transient D1 error, say) still falls through to the outer
      // `unexpected(err)` instead of being misreported as "project not found". Same 404 an
      // enumeration attempt on `GET /v1/projects/:id` would get, for the same reason.
      if (!(await projectById(env.DB, wsTenantId, projectId))) {
        return Response.json({ error: 'project not found' }, { status: 404 });
      }
      const made = await createMilestone(env.DB, wsTenantId, projectId, {
        name,
        targetDate: body.targetDate ?? null,
        sortOrder: body.sortOrder,
      });
      return Response.json({ milestone: made }, { status: 201 });
    }

    return Response.json({ error: 'method not allowed' }, { status: 405 });
  } catch (err) {
    return unexpected(err);
  }
}

// DELETE /v1/milestones/:id — one milestone, removed on its own without deleting its project.
export async function milestone({ request, env }: WorkerRequest, milestoneMatch: RegExpMatchArray): Promise<Response> {
  try {
    let u = await resolveUser(request, env);
    if (!u) u = await resolveHubUser(request, env);
    if (!u) return Response.json({ error: 'sign in to continue' }, { status: 401 });
    const refused = refuseByRole(u, 'manage');
    if (refused) return refused;

    // PATCH: the project page edits a milestone in place (name, date). Scoped by tenant, so
    // another workspace's milestone id reads as not found.
    if (request.method === 'PATCH') {
      const body = (await request.json()) as { name?: unknown; targetDate?: string | null };
      if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
        return Response.json({ error: 'name is required' }, { status: 400 });
      }
      if (isInvalidDueAt(body.targetDate)) {
        return Response.json({ error: 'targetDate must be YYYY-MM-DD' }, { status: 400 });
      }
      const id = milestoneMatch[1]!;
      if (!(await milestoneById(env.DB, u.tenantId, id))) {
        return Response.json({ error: 'milestone not found' }, { status: 404 });
      }
      const updated = await updateMilestone(env.DB, u.tenantId, id, {
        ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
        ...(body.targetDate !== undefined ? { targetDate: body.targetDate } : {}),
      });
      return Response.json({ milestone: updated });
    }
    if (request.method !== 'DELETE') return Response.json({ error: 'method not allowed' }, { status: 405 });
    if (!(await deleteMilestone(env.DB, u.tenantId, milestoneMatch[1]!))) {
      return Response.json({ error: 'milestone not found' }, { status: 404 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    return unexpected(err);
  }
}
