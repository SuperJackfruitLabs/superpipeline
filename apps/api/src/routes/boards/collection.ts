// The board collection: listing a workspace's boards and composing one.
import { type StageDef, stageFieldError, boardIntroError } from '../../board/board-do';
import { boardStub } from '../../board/stub';
import { recordBoard, listBoards, countBoardsComposedToday } from '../../db/catalog';
import { newId } from '../../ids';
import { isWorkspaceAdmin } from '../callers';
import type { BoardCaller } from './request';
import { registerStageCapabilities } from './stage-capabilities';

/** GET /v1/boards — list the workspace's boards · POST /v1/boards — create one. */
export async function boardCollection({ request, env, tenantId, user, agent }: BoardCaller): Promise<Response> {
  if (request.method === 'GET') {
    // Each row says how many live cards the board holds and how many need a person now, so a
    // switcher can read "7 cards · 4 need you" without opening every board. A board that does
    // not answer reads 0/0 rather than dropping out of the list.
    const rows = await listBoards(env.DB, tenantId);
    const counts = await Promise.allSettled(rows.map((b) => boardStub(env, tenantId, b.id).summaryCounts()));
    return Response.json({
      boards: rows.map((b, i) => {
        const c = counts[i];
        return {
          id: b.id,
          name: b.name,
          cardCount: c.status === 'fulfilled' ? c.value.cardCount : 0,
          needsYouCount: c.status === 'fulfilled' ? c.value.needsYouCount : 0,
          lastActivityAt: b.updatedAt,
        };
      }),
    });
  }
  if (request.method !== 'POST') return Response.json({ error: 'method not allowed' }, { status: 405 });

  // Validated rather than asserted. The assertion `as { name: string; stages: StageDef[] }`
  // promised the compiler two fields the request had no obligation to carry, and the first
  // caller to get it wrong — `{"name": "…", "template": "software"}`, which is what a
  // reasonable person types — reached `[...board.stages]` inside the Durable Object and got
  // **HTTP 500 `board.stages is not iterable`**. A malformed request answered with a server
  // error, and an error that says `board.stages` to somebody who wrote `template` sends them
  // looking for a bug in the board.
  //
  // The checks stop at shape: a non-empty array of objects each carrying a string `key`.
  // What a *valid pipeline* is remains the board's decision — it normalises owners and
  // routing on the way in (`board-do.ts`) — and duplicating that here is how a route starts
  // refusing things the board would have accepted.
  const body = (await request.json().catch(() => null)) as { name?: unknown; stages?: unknown; intro?: unknown } | null;
  if (!body || typeof body !== 'object') {
    return Response.json({ error: { message: 'Expected a JSON object.' } }, { status: 400 });
  }
  if (typeof body.name !== 'string' || body.name.trim() === '') {
    return Response.json({ error: { message: '`name` is required and must be a non-empty string.' } }, { status: 400 });
  }
  if (!Array.isArray(body.stages) || body.stages.length === 0) {
    return Response.json(
      {
        error: {
          message:
            '`stages` is required and must be a non-empty array. There is no `template` field — a client picks the stages and sends them.',
        },
      },
      { status: 400 },
    );
  }
  if (!body.stages.every((s) => s && typeof s === 'object' && typeof (s as { key?: unknown }).key === 'string')) {
    return Response.json({ error: { message: 'Every stage needs a string `key`.' } }, { status: 400 });
  }
  const name = body.name;
  const stages = body.stages as StageDef[];
  // The optional fields below (and a stage's decision timeout) are checked here because board create does not run the stage
  // validator: a too-long summary or a malformed intro is a 400 at the door.
  for (const st of stages) {
    const bad =
      st.summary === undefined && st.timeout === undefined && st.quorum === undefined
        ? null
        : stageFieldError({ key: st.key, summary: st.summary, timeout: st.timeout, quorum: st.quorum, approvalDeciderPrincipalIds: st.approvalDeciderPrincipalIds });
    if (bad) return Response.json({ error: { code: 'INVALID_STAGES', message: bad } }, { status: 400 });
  }
  // Who approves a bound subject is decision policy, a workspace admin's to set even on a new board
  // (charter 2026-11-08, decision 6): otherwise a member, or a composing agent, could create a
  // publishing board naming themselves its deciders. A plain `gate: "approval"` stays open to any
  // creator: it only adds a human check, and a new board has no policy to weaken.
  // A timeout too: its escalation reaches the workspace's owners and admins, which is theirs to set.
  // A quorum too: who must agree before work passes is decision policy (charter 2026-11-09, more than one approver, decision 9).
  const setsDeciders = stages.some(
    (st) => st.approvalSubjectSchema !== undefined || (st.approvalDeciderPrincipalIds?.length ?? 0) > 0 || st.timeout !== undefined || st.quorum !== undefined,
  );
  if (setsDeciders && !isWorkspaceAdmin(env, user)) {
    return Response.json(
      { error: { code: 'WORKSPACE_ADMIN_REQUIRED', message: 'only a workspace owner or admin can create a board whose stages bind an approval subject, name its deciders, set a decision timeout or require a quorum' } },
      { status: 403 },
    );
  }
  if (body.intro !== undefined) {
    const bad = boardIntroError(body.intro);
    if (bad) return Response.json({ error: { code: 'INVALID_INTRO', message: bad } }, { status: 400 });
  }

  /**
   * An AGENT composing a board: owned by a real human, and bounded per day.
   *
   * A new board has no cards, which is why this is reachable at all — bad routing on an empty
   * board strands nothing, where changing a live stage re-routes every card on it. What still
   * has to hold is the rest of the queueing argument: somebody is answerable for it, and a loop
   * cannot make five hundred.
   */
  let composedByAgentId: string | null = null;
  let composedFor: string | null = user?.userId ?? null;
  if (agent) {
    const owner = agent.queueing?.ownerUserId ?? null;
    if (!owner) {
      return Response.json(
        {
          error: {
            code: 'AGENT_HAS_NO_OWNER',
            message: 'this agent has no owner, so there is nobody to be answerable for the board',
          },
        },
        { status: 403 },
      );
    }
    const ceiling = agent.queueing?.boardCeilingPerDay ?? 3;
    const already = await countBoardsComposedToday(env.DB, agent.agentId!);
    if (already >= ceiling) {
      return Response.json(
        {
          error: {
            code: 'BOARD_CEILING_REACHED',
            message: `this agent has composed ${already} boards today, at its ceiling of ${ceiling}`,
          },
        },
        { status: 429 },
      );
    }
    composedByAgentId = agent.agentId;
    composedFor = owner;
  }

  const id = newId('brd');
  const snapshot = await boardStub(env, tenantId, id).init({ id, tenantId, name, stages, ...(body.intro !== undefined ? { intro: body.intro as { lede: string; composeHint: string } } : {}) });
  await recordBoard(env.DB, tenantId, {
    id,
    name,
    stagesJson: JSON.stringify(snapshot.stages),
    // `boards` recorded no creator at all before this. An agent-composed board would otherwise
    // be indistinguishable from the operator's, which is the gap `queued_by_agent_id` closed
    // for cards.
    createdBy: composedFor,
    createdByAgentId: composedByAgentId,
  });
  // A stage naming a capability IS the act of declaring the workspace needs that work done,
  // so it registers the capability. Read from the SNAPSHOT rather than the request, because
  // the DO normalised the owners on the way in and the registry must record what was
  // actually stored, not what was asked for.
  await registerStageCapabilities(env, tenantId, snapshot.stages, user?.userId ?? null);
  return Response.json({ boardId: id, board: snapshot }, { status: 201 });
}
