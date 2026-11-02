// Workspace-wide reads and administration: the superwitness backfill and stale cards.
import type { StaleCardView } from '../board/board-do';
import { boardStub } from '../board/stub';
import { listBoards } from '../db/catalog';
import { reportingEnabled } from '../superwitness/config';
import { resolveWorkspaceCaller } from './callers';
import { statusForCode, unexpected } from './errors';
import type { WorkerRequest } from './router';
import { logError } from '../log';

/**
 * POST /v1/admin/superwitness/backfill — enqueue a superwitness report for every run on one
 * board (superwitness app spec §3.5; ruling R18). Idempotent, and the repair tool for parked or
 * missed reports.
 *
 * A person with `manage` (admin or owner) in the board's workspace. Not an agent: re-reporting a
 * board's history is administration, not shaping work. 409 while reporting is off, because an
 * off reporter writes no outbox rows and a 200 would claim work that did not happen.
 */
export async function superwitnessBackfill({ request, env }: WorkerRequest): Promise<Response> {
  if (request.method !== 'POST') return Response.json({ error: 'method not allowed' }, { status: 405 });
  const caller = await resolveWorkspaceCaller(request, env, { human: 'manage', agentScope: null });
  if (caller instanceof Response) return caller;
  let body: { board_id?: unknown } | null = null;
  try {
    body = (await request.json()) as { board_id?: unknown };
  } catch {
    body = null;
  }
  const boardId = typeof body?.board_id === 'string' ? body.board_id.trim() : '';
  if (boardId === '') return Response.json({ error: 'board_id is required' }, { status: 400 });
  if (!reportingEnabled(env)) {
    return Response.json({ error: 'run reporting is off: SUPERWITNESS_URL is not set' }, { status: 409 });
  }
  const boards = await listBoards(env.DB, caller.tenantId);
  if (!boards.some((b) => b.id === boardId)) return Response.json({ error: 'board not found' }, { status: 404 });
  const result = await boardStub(env, caller.tenantId, boardId).enqueueAllRunReports();
  if (!result.ok) return Response.json({ error: result }, { status: statusForCode(result.code) });
  return Response.json({ board_id: boardId, ...result.value });
}

/**
 * GET /v1/stale[?hours=n] — cards waiting past a threshold, across every board in the workspace.
 *
 * A fan-out over the tenant's boards (the catalog in D1), one DO call each, the same shape as a
 * project rollup. A board that fails to answer is counted in `boardsUnanswered` and logged, never
 * allowed to fail the whole list. Without `hours`, each board's own threshold and off switch
 * apply; with it, every board is asked with that threshold (`hours=0`: everything waiting now).
 */
export async function staleAcrossBoards({ request, env, url }: WorkerRequest): Promise<Response> {
  try {
    if (request.method !== 'GET') return Response.json({ error: 'method not allowed' }, { status: 405 });
    const caller = await resolveWorkspaceCaller(request, env, { human: 'read', agentScope: 'read' });
    if (caller instanceof Response) return caller;
    const raw = url.searchParams.get('hours');
    let afterHours: number | undefined;
    if (raw !== null) {
      afterHours = Number(raw);
      if (raw.trim() === '' || !Number.isFinite(afterHours) || afterHours < 0) {
        return Response.json({ error: { code: 'INVALID_STALE_SETTINGS', message: '`hours` must be a number, 0 or more' } }, { status: 400 });
      }
    }
    // `attention=1`: the Needs-you feed — everything waiting on a person now, plus ownerless-stage
    // cards past their board's threshold (see `collectStale`).
    const attention = url.searchParams.get('attention') === '1';
    const nowIso = new Date().toISOString();
    const cards: StaleCardView[] = [];
    let boardsUnanswered = 0;
    for (const board of await listBoards(env.DB, caller.tenantId)) {
      try {
        cards.push(...(await boardStub(env, caller.tenantId, board.id).staleCards({ nowIso, attention, ...(afterHours !== undefined ? { afterHours } : {}) })));
      } catch (err) {
        boardsUnanswered += 1;
        logError(`GET /v1/stale: board ${board.id} did not answer`, err);
      }
    }
    cards.sort((a, b) => a.since.localeCompare(b.since));
    return Response.json({ cards, boardsUnanswered });
  } catch (err) {
    return unexpected(err);
  }
}
