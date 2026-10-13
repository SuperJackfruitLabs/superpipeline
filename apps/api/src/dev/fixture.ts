import type { Env } from '../env';
import { boardStub } from '../board/stub';
import type { FixtureWorld } from './fixture-types';

/** Null unless this is the dev fixture route AND both flags are on — then the caller 404s as usual. */
export async function handleDevFixture(request: Request, env: Env, path: string): Promise<Response | null> {
  if (path !== '/v1/dev/fixture') return null;
  if (env.DEV_AUTH !== 'true' || env.FIXTURE_IMPORT !== 'true') return null;
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const w = (await request.json()) as FixtureWorld;
  const t = w.tenant.id;
  const db = env.DB;
  const boardIds = (await db.prepare(`SELECT id FROM boards WHERE tenant_id = ?`).bind(t).all<{ id: string }>()).results.map((r) => r.id);
  const del = [
    `DELETE FROM agent_card_queues WHERE tenant_id = ?`,
    `DELETE FROM agent_tokens WHERE tenant_id = ?`,
    `DELETE FROM capability_implications WHERE tenant_id = ?`,
    `DELETE FROM capabilities WHERE tenant_id = ?`,
    `DELETE FROM labels WHERE tenant_id = ?`,
    `DELETE FROM project_rollups WHERE tenant_id = ?`,
    `DELETE FROM milestones WHERE tenant_id = ?`,
    `DELETE FROM projects WHERE tenant_id = ?`,
    `DELETE FROM card_links_external WHERE tenant_id = ?`,
    `DELETE FROM agents WHERE tenant_id = ?`,
    `DELETE FROM boards WHERE tenant_id = ?`,
    `DELETE FROM memberships WHERE tenant_id = ?`,
    `DELETE FROM tenants WHERE id = ?`,
  ].map((s) => db.prepare(s).bind(t));
  const ins: D1PreparedStatement[] = [
    db.prepare(`DELETE FROM users WHERE id = ?`).bind(w.user.id),
    db.prepare(`INSERT INTO tenants (id, slug, name, forge_host, external_id, external_source, created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(t, w.tenant.slug, w.tenant.name, w.tenant.forgeHost, w.tenant.externalId, w.tenant.externalSource, w.tenant.createdAt),
    db.prepare(`INSERT INTO users (id, email, name, created_at) VALUES (?,?,?,?)`).bind(w.user.id, w.user.email, w.user.name, w.user.createdAt),
    db.prepare(`INSERT INTO memberships (id, tenant_id, user_id, role, created_at) VALUES (?,?,?,?,?)`).bind(w.membership.id, t, w.user.id, w.membership.role, w.membership.createdAt),
    ...w.boards.map((b) => db.prepare(`INSERT INTO boards (id, tenant_id, name, stages_json, created_by, created_by_agent_id, created_at, updated_at) VALUES (?,?,?,?,?,NULL,?,?)`)
      .bind(b.id, t, b.name, JSON.stringify(b.stages), b.createdBy, b.createdAt, b.updatedAt)),
    ...w.agents.flatMap((a) => [
      db.prepare(`INSERT INTO agents (id, tenant_id, name, icon_url, capabilities_json, concurrency, external_id, external_source, owner_user_id, may_queue_to_json, queue_ceiling_per_hour, board_ceiling_per_day, created_at, role)
                  VALUES (?,?,?,NULL,?,1,?,'agentpod',?,?,20,3,?,?)`)
        .bind(a.id, t, a.name, JSON.stringify(a.capabilities), a.externalId, a.ownerUserId, a.mayQueueTo ? JSON.stringify(a.mayQueueTo) : null, a.createdAt, a.role ?? null),
      ...Array.from({ length: a.tokens }, (_, i) => {
        const id = `tok_fx_${a.name.replace(/-/g, '_')}_${i + 1}`;
        const at = new Date(Date.parse('2026-09-02T00:00:00Z') + (i + 1) * 60_000).toISOString();
        return db.prepare(`INSERT INTO agent_tokens (id, tenant_id, agent_id, token_hash, scopes_json, created_at) VALUES (?,?,?,?,?,?)`)
          .bind(id, t, a.id, `fixture-${id}`, '["claim","run"]', at);
      }),
    ]),
    ...w.capabilities.map((c) => db.prepare(`INSERT INTO capabilities (id, tenant_id, key, name, description, tags_json, examples_json, input_modes_json, output_modes_json, origin, created_by, created_at) VALUES (?,?,?,?,?,'[]','[]','[]','[]',?,?,?)`)
      .bind(`cap_fx_${c.key}`, t, c.key, c.key, c.description, c.origin, w.user.id, c.createdAt)),
    ...w.implications.map((i) => db.prepare(`INSERT INTO capability_implications (tenant_id, implies_from, implies_to, created_at, created_by) VALUES (?,?,?,?,?)`)
      .bind(t, i.from, i.to, i.createdAt, w.user.id)),
    ...w.labels.map((l) => db.prepare(`INSERT INTO labels (id, tenant_id, name, colour, origin, created_by, created_at) VALUES (?,?,?,?,?,NULL,?)`)
      .bind(l.id, t, l.name, l.colour, l.origin, l.createdAt)),
    ...w.projects.map((p) => db.prepare(`INSERT INTO projects (id, tenant_id, name, description, target_date, state, health, lead_user_id, created_at) VALUES (?,?,?,?,?,?,?,?,?)`)
      .bind(p.id, t, p.name, p.description, p.targetDate, p.state, p.health, p.leadUserId, p.createdAt)),
    ...w.milestones.map((m) => db.prepare(`INSERT INTO milestones (id, project_id, tenant_id, name, target_date, sort_order, created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(m.id, m.projectId, t, m.name, m.targetDate, m.sortOrder, m.createdAt)),
    ...w.externalLinks.map((x) => db.prepare(`INSERT INTO card_links_external (tenant_id, from_board_id, from_card_id, to_board_id, to_card_id, kind, created_at) VALUES (?,?,?,?,?,?,?)`)
      .bind(t, x.fromBoardId, x.fromCardId, x.toBoardId, x.toCardId, x.kind, x.createdAt)),
  ];
  await db.batch([...del, ...ins]);
  // Boards that were in the tenant before but are not in this world: empty their DOs too.
  const empty = { meta: {}, cards: [], runs: [], activities: [], events: [], notifications: [], gates: [], approvalSubjects: [], elicitations: [], references: [], links: [], comments: [] };
  for (const id of boardIds.filter((id) => !w.dos[id])) await boardStub(env, t, id).importFixture(empty);
  let cards = 0;
  for (const b of w.boards) {
    const fb = w.dos[b.id] ?? empty;
    const meta = { boardId: b.id, tenantId: t, name: b.name, stages: JSON.stringify(b.stages), ...fb.meta };
    const r = await boardStub(env, t, b.id).importFixture({ ...fb, meta });
    if (!r.ok) return Response.json({ error: r.code, detail: r.detail }, { status: r.code === 'UNKNOWN_COLUMN' ? 400 : 403 });
    cards += r.cards;
  }
  return Response.json({ ok: true, boards: w.boards.length, cards });
}
