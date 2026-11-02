// A service reading a run's evidence.
import { resolveHubService, EVIDENCE_READ } from '../../auth/resolve';
import { boardStub } from '../../board/stub';
import { principalIdsFor, hubSubjectsFor } from '../../db/catalog';
import type { Env } from '../../env';
import { statusForCode, unexpected } from '../errors';

/**
 * GET /v1/boards/:id/runs/:runId/evidence — a SERVICE principal (superwitness) reading a run
 * (contract C4). Not an agent route and not a human route: neither kind may read it, and a
 * service may read nothing else. The tenant comes from the token's mapped fleet, so a board in
 * another tenant is simply not found.
 */
export async function runEvidence(request: Request, env: Env, boardId: string, runId: string, versioned = false): Promise<Response> {
  const service = await resolveHubService(request, env);
  if (!service) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'a hub-issued service token for a mapped fleet is required' } },
      { status: 401 },
    );
  }
  if (!service.scopes.includes(EVIDENCE_READ)) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'this principal does not hold evidence:read' } },
      { status: 403 },
    );
  }
  try {
    const stub = boardStub(env, service.tenantId, boardId);
    const extension = versioned ? await stub.getRunEvidenceV1(runId) : null;
    const result = extension ? (extension.ok ? { ok: true as const, value: extension.value.pipeline } : extension) : await stub.getRunEvidence(runId);
    if (result.ok) {
      const ev = result.value;
      const ids = await principalIdsFor(env.DB, service.tenantId, [
        ev.run.agent_id,
        ...ev.gates.flatMap((g) => [g.produced_by, g.decided_by]),
      ]);
      const subs = await hubSubjectsFor(env.DB, ev.gates.map((g) => g.decided_by));
      const prn = (local: string | null) => (local ? ids.get(local) ?? null : null);
      const pipeline = {
        ...ev,
        run: { ...ev.run, agent_principal_id: prn(ev.run.agent_id) },
        gates: ev.gates.map((g) => {
          const decidedBy = prn(g.decided_by);
          return {
            ...g,
            produced_by_principal_id: prn(g.produced_by),
            decided_by_principal_id: decidedBy,
            // Only when there is no principal id: one way to name the judge, never two.
            decided_by_hub_sub: decidedBy === null && g.decided_by ? subs.get(g.decided_by) ?? null : null,
          };
        }),
      };
      return Response.json(extension?.ok ? { ...extension.value, pipeline } : pipeline);
    }
    if (result.code === 'NOT_INITIALIZED') return Response.json({ error: { code: 'BOARD_NOT_FOUND' } }, { status: 404 });
    if (result.code === 'RUN_NOT_FOUND') return Response.json({ error: { code: 'RUN_NOT_FOUND' } }, { status: 404 });
    return Response.json({ error: { code: result.code } }, { status: statusForCode(result.code) });
  } catch (err) {
    return unexpected(err);
  }
}
