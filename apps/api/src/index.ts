/**
 * Superpipeline API — the edge Worker (docs/02-architecture.md). It authenticates, resolves the tenant,
 * and routes board requests to the per-(tenant, board) Board Durable Object, serving the SvelteKit
 * SPA same-origin for everything else.
 *
 * Auth (docs/05 §3). Three principals, resolved before dispatch:
 *   - humans      — a signed `superpipeline_session` cookie from GitHub OAuth (auth/routes.ts). Stateless
 *                   HMAC, no session store. This is what board/card administration requires.
 *   - agents      — a `spa_` bearer on the agent routes only: `…/claims` and `…/runs/*`. The tenant
 *                   AND the agent identity come from the token, never from the request.
 *   - dev headers — `X-Tenant-Id`/`X-Agent-Id`/`?tenant=` are a full credential, so they are gated
 *                   on DEV_AUTH === 'true' and are absent from wrangler.jsonc by design. A deploy
 *                   rejects them. (An earlier version of this comment described them as the primary
 *                   mechanism awaiting "OAuth/magic-link"; real login shipped, and no magic-link was
 *                   ever built.)
 *
 * Both recorded permissions are now checked, where before neither was:
 *   - token `scopes` on the agent routes (auth/scopes.ts) — `claim` to take a card, `run` to drive
 *     one, with `claim` grandfathering `run` for tokens minted before the split.
 *   - `memberships.role` on every human route (db/members.ts) — viewer reads, member works the
 *     board, admin manages boards and agents, owner manages people and the fleet link. A caller
 *     with no membership is refused rather than demoted to a reader.
 */
import { BoardDO } from './board/board-do';
import { boardStub, projectSummaries } from './board/stub';
import { listAllBoards, touchBoard } from './db/catalog';
import { computeRollup, listAllProjects } from './db/projects';
import type { Env } from './env';
import { logReporter } from './superwitness/log';
import { withRunTelemetry } from './telemetry/run-telemetry';
import { touchOnSuccess } from './routes/activity';
import { dispatch } from './routes/router';
import { webApp } from './routes/system';
import { ROUTES } from './routes/table';

export { BoardDO };

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    return dispatch(ROUTES, { request, env, url, path }, path, request.method, webApp);
  },

  /**
   * Drain every board's push delivery queue and superwitness run-report outbox.
   *
   * `POST /v1/boards/:id/push/dispatch` has always existed and nothing ever called it on a
   * schedule: the queue drained only on a DO alarm or when somebody POSTed by hand, so a delivery
   * whose alarm was missed sat there indefinitely. A queue with no drain is a queue that loses
   * things quietly.
   *
   * Best-effort per board, and deliberately so: one board whose DO throws must not stop the sweep
   * for every other board in the deployment.
   */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        for (const board of await listAllBoards(env.DB)) {
          try {
            await boardStub(env, board.tenantId, board.id).dispatchPushDeliveries();
          } catch {
            /* one board's failure is not the sweep's */
          }
          try {
            await boardStub(env, board.tenantId, board.id).sweepBoard(new Date().toISOString());
          } catch (err) {
            // A failing sweep on one board must not stop the rest of the loop — but swallowing it
            // silently meant a board failing every five-minute tick, forever, left no trace
            // anywhere. Logged, not rethrown: the loop still continues to the next board.
            console.error(`sweepBoard failed for board ${board.id}`, err);
          }
          // The superwitness outbox's backstop (superwitness app spec §3.5): the board alarm is the
          // drain; this catches a board whose alarm was lost. Due rows only — backoff still holds.
          try {
            await boardStub(env, board.tenantId, board.id).drainRunReports();
          } catch {
            logReporter('error', { msg: 'superwitness.sweep_failed', 'board.id': board.id });
          }
        }
        // Third arm, same shape as the two above: every project's rollup (Task 19), refreshed so
        // `GET /v1/projects/:id/rollup` almost never has to pay for the fan-out itself — the 60s
        // cache window is usually already warm by the time anyone asks. `computeRollup` is itself
        // forgiving of a board that fails to answer (`partial`/`boardsUnanswered`); this try/catch
        // is only for a failure in computeRollup's OWN bookkeeping (e.g. the D1 write that caches
        // the row), logged rather than swallowed for the same reason the sweep above is.
        for (const project of await listAllProjects(env.DB)) {
          try {
            await computeRollup(env.DB, projectSummaries(env), project.tenantId, project.id);
          } catch (err) {
            console.error(`computeRollup failed for project ${project.id}`, err);
          }
        }
      })(),
    );
  },
} satisfies ExportedHandler<Env>;

export default {
  fetch: (request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> =>
    withRunTelemetry(request, async () => {
      const response = await worker.fetch(request, env);
      const touch = touchOnSuccess.get(request);
      if (touch && response.status < 400) {
        // The board's own answer is already given; failing to note the activity must not undo it,
        // and the D1 write runs after the response (waitUntil) so it never delays it.
        const write = touchBoard(env.DB, touch.tenantId, touch.boardId, new Date().toISOString()).catch((err) =>
          console.error('touchBoard failed', String(err)),
        );
        if (ctx) ctx.waitUntil(write);
        else await write;
      }
      return response;
    }),
  scheduled: (event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> =>
    worker.scheduled(event, env, ctx),
} satisfies ExportedHandler<Env>;
