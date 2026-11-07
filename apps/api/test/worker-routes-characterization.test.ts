import { SELF, env } from 'cloudflare:test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * The Worker's HTTP surface, pinned before `src/index.ts` is split into a router and route modules
 * (docs/contributor/modularity-plan.md, Phase 3).
 *
 * One scripted session drives every route the Worker matches: each family's happy path, its wrong
 * methods, its refusals (no credential, the wrong role, the wrong kind of credential), malformed
 * bodies, and the paths where two patterns overlap and the order decides which handler answers. For
 * each request it records the status, every response header but `date`, and the body. Ids, times,
 * tokens and digests become stable placeholders, so the record is the same on every run.
 *
 * The static assets binding is replaced by a recorder, so a request that falls through to the web
 * app is visible as such (`spa <path>`), and once more with no binding at all (the bare 404).
 *
 * The record is a snapshot (`__snapshots__/worker-routes-characterization.test.ts.snap`), written
 * against the code before the split. It must not be regenerated to make a restructuring pass.
 */

const ORIGIN = 'https://api.test';
const T = 'tnt_http';
const R = 'tnt_http_roles';

const STAGES = [
  { key: 'inbox', name: 'Inbox', order: 0, ownerKind: 'human' },
  { key: 'research', name: 'Research', order: 1, ownerKind: 'capability', owner: 'research' },
  { key: 'review', name: 'Review', order: 2, ownerKind: 'human', gate: 'approval' },
  { key: 'done', name: 'Done', order: 3 },
];

interface Step {
  step: string;
  request: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
}
const steps: Step[] = [];

function named(seen: Map<string, string>, value: string, prefix: string): string {
  let name = seen.get(value);
  if (!name) {
    name = `${prefix}#${seen.size + 1}`;
    seen.set(value, name);
  }
  return name;
}
const ids = new Map<string, string>();
const text = (s: string): string =>
  s
    .replace(/\bspa_[A-Za-z0-9_-]{16,}/g, '<token>')
    .replace(/\b([a-z]+)_[0-9a-f]{16,}\b/g, (id, prefix: string) => named(ids, id, prefix))
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, (id) => named(ids, id, 'uuid'))
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z\b/g, '<time>')
    .replace(/\b20\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\b/g, '<time>')
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, '<date>')
    .replace(/\b1[6-9]\d{11}\b/g, '<ms>')
    .replace(/\b[0-9a-f]{64}\b/g, '<sha256>')
    .replace(/([?&](?:state|code_challenge|nonce)=)[^&"\s]+/g, '$1<random>')
    .replace(/(superpipeline_[a-z_]+=)[^;"\s]+/g, '$1<cookie>');
const normalize = (v: unknown): unknown => {
  if (typeof v === 'string') return text(v);
  if (typeof v === 'number' && v > 1.6e12 && v < 4e12) return '<ms>';
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normalize(x)]));
  return v;
};

/** Sort `body[key]` by its recorded form, for a list whose order the route does not fix. */
function unorder(body: unknown, key: string | undefined): unknown {
  if (!key || !body || typeof body !== 'object') return body;
  const list: unknown = Reflect.get(body, key);
  if (Array.isArray(list)) Reflect.set(body, key, list.toSorted((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y))));
  return body;
}

/** The value at `path` inside a parsed body, or undefined. */
function pick(value: unknown, ...path: (string | number)[]): unknown {
  let at = value;
  for (const key of path) at = at && typeof at === 'object' ? Reflect.get(at, key) : undefined;
  return at;
}
/** A string (an id, a token) inside a parsed body; `missing` when it is not there. */
const str = (value: unknown, ...path: (string | number)[]): string => {
  const at = pick(value, ...path);
  return typeof at === 'string' || typeof at === 'number' ? String(at) : 'missing';
};
const num = (value: unknown, ...path: (string | number)[]): number | undefined => {
  const at = pick(value, ...path);
  return typeof at === 'number' ? at : undefined;
};

interface Opts {
  as?: Record<string, string>;
  body?: unknown;
  raw?: string;
  query?: string;
  /** A list the route answers in no fixed order (rows created in the same second): recorded sorted. */
  unordered?: string;
}

/** Send one request through the Worker and record what came back. Returns the parsed body. */
async function hit(step: string, method: string, path: string, opts: Opts = {}): Promise<unknown> {
  const headers: Record<string, string> = { ...opts.as };
  let body: string | undefined;
  if (opts.raw !== undefined) body = opts.raw;
  else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers['Content-Type'] = 'application/json';
  }
  const res = await SELF.fetch(`${ORIGIN}${path}${opts.query ?? ''}`, { method, headers, body, redirect: 'manual' });
  const raw = await res.text();
  let parsed: unknown = raw;
  if ((res.headers.get('content-type') ?? '').includes('json') && raw !== '') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }
  const kept = [...res.headers.entries()].filter(([k]) => k !== 'date').toSorted(([a], [b]) => a.localeCompare(b));
  steps.push({
    step,
    request: `${method} ${text(path)}${opts.query ? text(opts.query) : ''}`,
    status: res.status,
    headers: Object.fromEntries(kept.map(([k, v]) => [k, text(v)])),
    body: unorder(normalize(parsed), opts.unordered),
  });
  return parsed;
}

const realAssets: unknown = Reflect.get(env, 'ASSETS');

beforeAll(async () => {
  for (const [id, slug] of [[T, 'http'], [R, 'http-roles']] as const) {
    await env.DB.prepare(`INSERT INTO tenants (id, slug, name) VALUES (?, ?, ?)`).bind(id, slug, slug).run();
  }
  Reflect.set(env, 'ASSETS', { fetch: async (req: Request) => new Response(`spa ${new URL(req.url).pathname}`, { headers: { 'x-from': 'assets' } }) });
});
afterAll(() => {
  Reflect.set(env, 'ASSETS', realAssets);
});

describe('the Worker HTTP surface, pinned before the split', () => {
  // Some 330 requests in one test: well past the default timeout on a busy runner.
  it('answers every route the same way', async () => {
    const owner = { 'X-Tenant-Id': T };
    // ----- the system routes, the dev fixture, and the fallthrough -----
    await hit('health', 'GET', '/health');
    await hit('health, wrong method, falls through to the app', 'POST', '/health');
    await hit('dev fixture, wrong method', 'GET', '/v1/dev/fixture');
    await hit('dev, unknown path falls through', 'GET', '/v1/dev/other');
    await hit('the app root', 'GET', '/');
    await hit('an app page', 'GET', '/boards/brd_0000000000000000');
    await hit('an unknown API path falls through', 'GET', '/v1/nothing');
    await hit('a prefix that is not /v1/boards', 'GET', '/v1/boardsx');

    // ----- sign-in, the hub handoff -----
    await hit('auth me, signed out', 'GET', '/auth/me');
    await hit('auth me, dev', 'GET', '/auth/me', { as: owner });
    await hit('auth login', 'GET', '/auth/login');
    await hit('auth logout', 'POST', '/auth/logout');
    await hit('auth unknown falls through', 'GET', '/auth/nothing');
    await hit('hub session renewal', 'POST', '/hub/session');
    await hit('hub session, wrong method', 'GET', '/hub/session');
    await hit('hub connect', 'GET', '/hub/connect');
    await hit('hub token, signed out', 'GET', '/hub/token');
    await hit('hub unknown falls through', 'GET', '/hub/nothing');

    // ----- MCP -----
    await hit('protected resource metadata', 'GET', '/.well-known/oauth-protected-resource');
    await hit('protected resource metadata for /mcp', 'GET', '/.well-known/oauth-protected-resource/mcp');
    await hit('protected resource metadata, other suffix', 'GET', '/.well-known/oauth-protected-resource/other');
    await hit('protected resource metadata, wrong method', 'POST', '/.well-known/oauth-protected-resource');
    await hit('mcp, signed out', 'POST', '/mcp', { body: { jsonrpc: '2.0', id: 1, method: 'initialize' } });
    await hit('mcp, a bearer nobody issued', 'POST', '/mcp', { as: { Authorization: 'Bearer nope' }, body: {} });
    await hit('mcp, GET signed out', 'GET', '/mcp');
    await hit('mcp/ is not /mcp', 'POST', '/mcp/');

    // ----- the workspace -----
    await hit('forge host, signed out', 'GET', '/v1/tenant/forge');
    await hit('forge host', 'GET', '/v1/tenant/forge', { as: owner });
    await hit('forge host, missing', 'PUT', '/v1/tenant/forge', { as: owner, body: {} });
    await hit('forge host, a URL', 'PUT', '/v1/tenant/forge', { as: owner, body: { forgeHost: 'https://forge.example.com/x' } });
    await hit('forge host, set', 'PUT', '/v1/tenant/forge', { as: owner, body: { forgeHost: 'forge.example.com' } });
    await hit('forge host, wrong method', 'POST', '/v1/tenant/forge', { as: owner, body: {} });
    await hit('tenant, signed out', 'GET', '/v1/tenant');
    await hit('tenant', 'GET', '/v1/tenant', { as: owner });
    await hit('tenant link, missing', 'PATCH', '/v1/tenant', { as: owner, body: {} });
    await hit('tenant link, malformed', 'PATCH', '/v1/tenant', { as: owner, body: { externalId: 'fleet_x' } });
    await hit('tenant link', 'PATCH', '/v1/tenant', { as: owner, body: { externalId: 'fleet_0123456789abcdef0123' } });
    await hit('tenant unlink', 'PATCH', '/v1/tenant', { as: owner, body: { externalId: null } });
    await hit('tenant link, not JSON', 'PATCH', '/v1/tenant', { as: owner, raw: '{' });
    await hit('tenant, wrong method', 'DELETE', '/v1/tenant', { as: owner });
    await hit('tenant/ is not /v1/tenant', 'GET', '/v1/tenant/', { as: owner });

    // ----- members and roles -----
    const bare = { 'X-Tenant-Id': R };
    await hit('members, signed out', 'GET', '/v1/members');
    await hit('members, empty workspace', 'GET', '/v1/members', { as: bare });
    await hit('member, bad email', 'POST', '/v1/members', { as: bare, body: { email: 'nope' } });
    await hit('member, bad role', 'POST', '/v1/members', { as: bare, body: { email: 'o@example.com', role: 'king' } });
    const own = await hit('member, an owner', 'POST', '/v1/members', { as: bare, body: { email: 'o@example.com', role: 'owner', name: 'Olive' } });
    const ownerOfR = { 'X-Tenant-Id': R, 'X-User-Id': str(own, 'member', 'userId') };
    await hit('members, dev header naming nobody once members exist', 'GET', '/v1/members', { as: bare });
    const view = await hit('member, a viewer', 'POST', '/v1/members', { as: ownerOfR, body: { email: 'v@example.com', role: 'viewer' } });
    const viewer = { 'X-Tenant-Id': R, 'X-User-Id': str(view, 'member', 'userId') };
    await hit('members, as the viewer', 'GET', '/v1/members', { as: viewer, unordered: 'members' });
    await hit('member, viewer may not add', 'POST', '/v1/members', { as: viewer, body: { email: 'x@example.com' } });
    await hit('member, role change', 'PATCH', `/v1/members/${str(view, 'member', 'userId')}`, { as: ownerOfR, body: { role: 'viewer' } });
    await hit('member, role change, bad role', 'PATCH', `/v1/members/${str(view, 'member', 'userId')}`, { as: ownerOfR, body: { role: 'x' } });
    await hit('member, the last owner steps down', 'PATCH', `/v1/members/${str(own, 'member', 'userId')}`, { as: ownerOfR, body: { role: 'admin' } });
    await hit('member, not a member', 'PATCH', '/v1/members/usr_nobody', { as: ownerOfR, body: { role: 'admin' } });
    await hit('member, removing the last owner', 'DELETE', `/v1/members/${str(own, 'member', 'userId')}`, { as: ownerOfR });
    await hit('member, wrong method', 'PUT', '/v1/members', { as: ownerOfR, body: {} });
    await hit('member, not JSON', 'POST', '/v1/members', { as: ownerOfR, raw: 'x' });
    await hit('members/a/b is not a member route', 'GET', '/v1/members/a/b', { as: ownerOfR });

    // ----- capabilities and implications -----
    await hit('implications, signed out', 'GET', '/v1/capabilities/implications');
    await hit('implications', 'GET', '/v1/capabilities/implications', { as: owner });
    await hit('implication, to itself', 'POST', '/v1/capabilities/implications', { as: owner, body: { from: 'code', to: 'code' } });
    await hit('implication, missing', 'POST', '/v1/capabilities/implications', { as: owner, body: {} });
    await hit('implication', 'POST', '/v1/capabilities/implications', { as: owner, body: { from: 'code-review', to: 'code' } });
    await hit('implication, remove', 'DELETE', '/v1/capabilities/implications', { as: owner, query: '?from=code-review&to=code' });
    await hit('implication, remove again', 'DELETE', '/v1/capabilities/implications', { as: owner, query: '?from=code-review&to=code' });
    await hit('implications, wrong method', 'PUT', '/v1/capabilities/implications', { as: owner, body: {} });
    await hit('capabilities, signed out', 'GET', '/v1/capabilities');
    await hit('capabilities', 'GET', '/v1/capabilities', { as: owner });
    await hit('capability, no key', 'POST', '/v1/capabilities', { as: owner, body: {} });
    const cap = await hit('capability', 'POST', '/v1/capabilities', { as: owner, body: { key: 'research', name: 'Research' } });
    await hit('capability, near another', 'POST', '/v1/capabilities', { as: owner, body: { key: 'researc' } });
    await hit('capability, again', 'POST', '/v1/capabilities', { as: owner, body: { key: 'research' } });
    await hit('capability, rename refused', 'PATCH', `/v1/capabilities/${str(cap, 'capability', 'id')}`, { as: owner, body: { key: 'x' } });
    await hit('capability, edit', 'PATCH', `/v1/capabilities/${str(cap, 'capability', 'id')}`, { as: owner, body: { description: 'Finds sources' } });
    await hit('capability, edit missing', 'PATCH', '/v1/capabilities/cap_nothing', { as: owner, body: { name: 'x' } });
    await hit('capability, delete missing', 'DELETE', '/v1/capabilities/cap_nothing', { as: owner });
    await hit('capabilities, wrong method', 'PUT', '/v1/capabilities', { as: owner, body: {} });

    // ----- labels -----
    await hit('labels, signed out', 'GET', '/v1/labels');
    await hit('labels', 'GET', '/v1/labels', { as: owner });
    await hit('label, no name', 'POST', '/v1/labels', { as: owner, body: { colour: 'red' } });
    await hit('label, no colour', 'POST', '/v1/labels', { as: owner, body: { name: 'Bug' } });
    const label = await hit('label', 'POST', '/v1/labels', { as: owner, body: { name: 'Bug', colour: 'red' } });
    await hit('label, again', 'POST', '/v1/labels', { as: owner, body: { name: 'Bug', colour: 'blue' } });
    await hit('label, edit', 'PATCH', `/v1/labels/${str(label, 'label', 'id')}`, { as: owner, body: { colour: 'green' } });
    await hit('label, edit blank', 'PATCH', `/v1/labels/${str(label, 'label', 'id')}`, { as: owner, body: { name: ' ' } });
    await hit('label, edit missing', 'PATCH', '/v1/labels/lbl_nothing', { as: owner, body: { colour: 'x' } });
    await hit('labels, wrong method', 'PUT', '/v1/labels', { as: owner, body: {} });

    // ----- agents -----
    await hit('agents, signed out', 'GET', '/v1/agents');
    await hit('agents', 'GET', '/v1/agents', { as: owner });
    await hit('agent, signed out', 'POST', '/v1/agents', { body: { name: 'X' } });
    const made = await hit('agent', 'POST', '/v1/agents', { as: owner, body: { name: 'Researcher', capabilities: ['research'] } });
    const bot = { Authorization: `Bearer ${str(made, 'token')}` };
    await hit('agent card', 'GET', `/v1/agents/${str(made, 'agent', 'id')}/card`, { as: owner });
    await hit('agent card, missing', 'GET', '/v1/agents/agt_nothing/card', { as: owner });
    await hit('agent card, wrong method', 'POST', `/v1/agents/${str(made, 'agent', 'id')}/card`, { as: owner });
    await hit('agent card, signed out', 'GET', `/v1/agents/${str(made, 'agent', 'id')}/card`);
    await hit('agent, edit', 'PATCH', `/v1/agents/${str(made, 'agent', 'id')}`, { as: owner, body: { name: 'Researcher 2' } });
    const minted = await hit('agent token, mint', 'POST', `/v1/agents/${str(made, 'agent', 'id')}/tokens`, { as: owner, body: {} });
    const coordinator = await hit('agent token, a coordinator', 'POST', `/v1/agents/${str(made, 'agent', 'id')}/tokens`, { as: owner, body: { scopes: ['read', 'plan', 'compose', 'queue'] } });
    const coord = { Authorization: `Bearer ${str(coordinator, 'token')}` };
    await hit('agent token, bad scopes', 'POST', `/v1/agents/${str(made, 'agent', 'id')}/tokens`, { as: owner, body: { scopes: ['fly'] } });
    await hit('agents, as a coordinator', 'GET', '/v1/agents', { as: coord });
    await hit('agent tokens, list', 'GET', `/v1/agents/${str(made, 'agent', 'id')}/tokens`, { as: owner });
    await hit('agent token, revoke', 'DELETE', `/v1/agents/${str(made, 'agent', 'id')}/tokens/${str(minted, 'tokenId')}`, { as: owner });
    await hit('agent, as its own bearer', 'GET', '/v1/agents', { as: bot });
    await hit('agents, wrong method', 'PUT', '/v1/agents', { as: owner, body: {} });
    await hit('agent, not JSON', 'POST', '/v1/agents', { as: owner, raw: '{' });
    await hit('agents/a/b is not an agent route', 'GET', '/v1/agents/a/b', { as: owner });

    // ----- the capability registry, as an agent -----
    await hit('capabilities, as an agent', 'GET', '/v1/capabilities', { as: bot });
    await hit('capability, an agent may not define one', 'POST', '/v1/capabilities', { as: bot, body: { key: 'x' } });
    await hit('labels, as an agent', 'GET', '/v1/labels', { as: bot });
    await hit('capabilities, as a coordinator', 'GET', '/v1/capabilities', { as: coord });
    await hit('labels, as a coordinator', 'GET', '/v1/labels', { as: coord });
    await hit('stale, as a coordinator', 'GET', '/v1/stale', { as: coord });

    // ----- projects and milestones -----
    await hit('projects, signed out', 'GET', '/v1/projects');
    await hit('projects', 'GET', '/v1/projects', { as: owner });
    await hit('project, no name', 'POST', '/v1/projects', { as: owner, body: {} });
    await hit('project, bad date', 'POST', '/v1/projects', { as: owner, body: { name: 'P', targetDate: 'soon' } });
    await hit('project, bad health', 'POST', '/v1/projects', { as: owner, body: { name: 'P', health: 'meh' } });
    const project = await hit('project', 'POST', '/v1/projects', { as: owner, body: { name: 'Launch', targetDate: '2031-02-01' } });
    await hit('project, again', 'POST', '/v1/projects', { as: owner, body: { name: 'Launch' } });
    await hit('project', 'GET', `/v1/projects/${str(project, 'project', 'id')}`, { as: owner });
    await hit('project, missing', 'GET', '/v1/projects/prj_nothing', { as: owner });
    await hit('project rollup', 'GET', `/v1/projects/${str(project, 'project', 'id')}/rollup`, { as: owner });
    await hit('project rollup, missing', 'GET', '/v1/projects/prj_nothing/rollup', { as: owner });
    await hit('project, edit', 'PATCH', `/v1/projects/${str(project, 'project', 'id')}`, { as: owner, body: { state: 'active', health: 'on-track' } });
    await hit('project, bad state', 'PATCH', `/v1/projects/${str(project, 'project', 'id')}`, { as: owner, body: { state: 'x' } });
    await hit('project, as an agent', 'PATCH', `/v1/projects/${str(project, 'project', 'id')}`, { as: bot, body: { description: 'by an agent' } });
    await hit('project, as a coordinator', 'PATCH', `/v1/projects/${str(project, 'project', 'id')}`, { as: coord, body: { description: 'by a coordinator' } });
    await hit('projects, as a coordinator', 'GET', '/v1/projects', { as: coord });
    await hit('project, an agent may not delete', 'DELETE', `/v1/projects/${str(project, 'project', 'id')}`, { as: bot });
    const ms = await hit('milestone', 'POST', `/v1/projects/${str(project, 'project', 'id')}/milestones`, { as: owner, body: { name: 'Beta', sortOrder: 1 } });
    await hit('milestone, bad order', 'POST', `/v1/projects/${str(project, 'project', 'id')}/milestones`, { as: owner, body: { name: 'B', sortOrder: 'x' } });
    await hit('milestones, wrong method', 'GET', `/v1/projects/${str(project, 'project', 'id')}/milestones`, { as: owner });
    await hit('milestone, edit', 'PATCH', `/v1/milestones/${str(ms, 'milestone', 'id')}`, { as: owner, body: { name: 'Beta 2' } });
    await hit('milestone, edit missing', 'PATCH', '/v1/milestones/mst_nothing', { as: owner, body: { name: 'x' } });
    await hit('milestone, wrong method', 'GET', `/v1/milestones/${str(ms, 'milestone', 'id')}`, { as: owner });
    await hit('milestone, signed out', 'DELETE', `/v1/milestones/${str(ms, 'milestone', 'id')}`);
    await hit('milestone, delete', 'DELETE', `/v1/milestones/${str(ms, 'milestone', 'id')}`, { as: owner });
    await hit('milestone, delete again', 'DELETE', `/v1/milestones/${str(ms, 'milestone', 'id')}`, { as: owner });
    await hit('milestones, the collection is not a route', 'GET', '/v1/milestones', { as: owner });
    await hit('projects, wrong method', 'PUT', '/v1/projects', { as: owner, body: {} });

    // ----- workspace reads and administration -----
    await hit('stale, signed out', 'GET', '/v1/stale');
    await hit('stale', 'GET', '/v1/stale', { as: owner });
    await hit('stale, bad hours', 'GET', '/v1/stale', { as: owner, query: '?hours=x' });
    await hit('stale, wrong method', 'POST', '/v1/stale', { as: owner });
    await hit('backfill, wrong method', 'GET', '/v1/admin/superwitness/backfill', { as: owner });
    await hit('backfill, signed out', 'POST', '/v1/admin/superwitness/backfill', { body: {} });
    await hit('backfill, as an agent', 'POST', '/v1/admin/superwitness/backfill', { as: bot, body: {} });
    await hit('backfill, no board', 'POST', '/v1/admin/superwitness/backfill', { as: owner, body: {} });
    await hit('backfill, not JSON', 'POST', '/v1/admin/superwitness/backfill', { as: owner, raw: '{' });
    await hit('backfill, unknown board', 'POST', '/v1/admin/superwitness/backfill', { as: owner, body: { board_id: 'brd_0000000000000000' } });

    await boardRoutes(owner, bot, coord, ownerOfR, viewer, bare);
    await hit('projects, delete', 'DELETE', `/v1/projects/${str(project, 'project', 'id')}`, { as: owner });
    await hit('agent, delete', 'DELETE', `/v1/agents/${str(made, 'agent', 'id')}`, { as: owner });
    await hit('capability, delete', 'DELETE', `/v1/capabilities/${str(cap, 'capability', 'id')}`, { as: owner });
    await hit('label, delete', 'DELETE', `/v1/labels/${str(label, 'label', 'id')}`, { as: owner });

    // ----- no assets binding: the bare 404 -----
    Reflect.deleteProperty(env, 'ASSETS');
    await hit('no assets binding', 'GET', '/somewhere');
    Reflect.set(env, 'ASSETS', realAssets);

    expect(steps).toMatchSnapshot();
  }, 120_000);
});

type Who = Record<string, string>;

async function boardRoutes(owner: Who, bot: Who, coord: Who, ownerOfR: Who, viewer: Who, bare: Who): Promise<void> {
  // ----- the board collection -----
  await hit('boards, signed out', 'GET', '/v1/boards');
  await hit('boards', 'GET', '/v1/boards', { as: owner });
  await hit('board, not an object', 'POST', '/v1/boards', { as: owner, body: 'x' });
  await hit('board, no name', 'POST', '/v1/boards', { as: owner, body: { stages: STAGES } });
  await hit('board, a template', 'POST', '/v1/boards', { as: owner, body: { name: 'B', template: 'software' } });
  await hit('board, a stage without a key', 'POST', '/v1/boards', { as: owner, body: { name: 'B', stages: [{ name: 'x' }] } });
  await hit('board, a long summary', 'POST', '/v1/boards', { as: owner, body: { name: 'B', stages: [{ key: 'a', summary: 'x'.repeat(2000) }] } });
  await hit('board, a bad intro', 'POST', '/v1/boards', { as: owner, body: { name: 'B', stages: STAGES, intro: 7 } });
  const created = await hit('board', 'POST', '/v1/boards', { as: owner, body: { name: 'Pinned', stages: STAGES } });
  const b = `/v1/boards/${str(created, 'boardId')}`;
  await hit('board, an agent without an owner composes', 'POST', '/v1/boards', { as: bot, body: { name: 'By a bot', stages: STAGES } });
  await hit('boards, as an agent', 'GET', '/v1/boards', { as: bot });
  await hit('boards, as a coordinator', 'GET', '/v1/boards', { as: coord });
  await hit('board, a coordinator with no owner composes', 'POST', '/v1/boards', { as: coord, body: { name: 'By a coordinator', stages: STAGES } });
  await hit('boards, wrong method', 'PUT', '/v1/boards', { as: owner, body: {} });
  await hit('boards/, a trailing slash', 'GET', '/v1/boards/', { as: owner });

  // ----- the board itself -----
  await hit('board, signed out', 'GET', b);
  await hit('board', 'GET', b, { as: owner });
  await hit('board, missing', 'GET', '/v1/boards/brd_0000000000000000', { as: owner });
  await hit('board, rename', 'PATCH', b, { as: owner, body: { name: 'Pinned, renamed' } });
  await hit('board, rename not JSON', 'PATCH', b, { as: owner, raw: '{' });
  await hit('board, as an agent', 'GET', b, { as: bot });
  await hit('board, as a coordinator', 'GET', b, { as: coord });
  await hit('board, a coordinator may not delete', 'DELETE', b, { as: coord });
  await hit('board, a coordinator may not rename', 'PATCH', b, { as: coord, body: { name: 'x' } });
  await hit('board, a dev agent', 'GET', b, { as: { ...owner, 'X-Agent-Id': 'agt_dev' } });
  await hit('board, a service token nobody issued', 'GET', b, { as: { Authorization: `Bearer x.${btoa(JSON.stringify({ principalKind: 'service' }))}.y` } });
  await hit('board ws without upgrade', 'GET', `${b}/ws`, { as: owner });
  await hit('stage, edit', 'PATCH', `${b}/stages/research`, { as: owner, body: { summary: 'Find sources', wipLimit: 3 } });
  await hit('stage, key refused', 'PATCH', `${b}/stages/research`, { as: owner, body: { key: 'x' } });
  await hit('stage, not an object', 'PATCH', `${b}/stages/research`, { as: owner, body: [1] });
  await hit('stage, unknown', 'PATCH', `${b}/stages/nowhere`, { as: owner, body: { summary: 'x' } });
  await hit('stage, as an agent', 'PATCH', `${b}/stages/research`, { as: bot, body: { owner: 'x' } });
  await hit('stage, a coordinator edits instructions', 'PATCH', `${b}/stages/research`, { as: coord, body: { instructions: 'Cite two.' } });
  await hit('stage, a coordinator may not reroute', 'PATCH', `${b}/stages/research`, { as: coord, body: { owner: 'x' } });
  await hit('stages, replace', 'PUT', `${b}/stages`, { as: owner, body: { stages: STAGES } });
  await hit('stages, refused', 'PUT', `${b}/stages`, { as: owner, body: { stages: [] } });
  await hit('stages, wrong method', 'GET', `${b}/stages`, { as: owner });

  // ----- cards -----
  await hit('card, bad due date', 'POST', `${b}/cards`, { as: owner, body: { title: 'x', dueAt: 'soon' } });
  const card = await hit('card', 'POST', `${b}/cards`, { as: owner, body: { title: 'Card A', spec: { goal: 'pin' }, priority: 2, dueAt: '2031-01-09' } });
  const c = `${b}/cards/${str(card, 'card', 'id')}`;
  await hit('card, by a coordinator', 'POST', `${b}/cards`, { as: coord, body: { title: 'Queued by a coordinator' } });
  await hit('card, by an agent', 'POST', `${b}/cards`, { as: bot, body: { title: 'From a bot' } });
  await hit('card, unknown label', 'POST', `${b}/cards`, { as: owner, body: { title: 'x', labelIds: ['lbl_nothing'] } });
  await hit('card, not JSON', 'POST', `${b}/cards`, { as: owner, raw: '{' });
  await hit('cards, wrong method', 'GET', `${b}/cards`, { as: owner });
  await hit('card', 'GET', c, { as: owner });
  await hit('card, missing', 'GET', `${b}/cards/card_0000000000000000`, { as: owner });
  await hit('card, edit', 'PATCH', c, { as: owner, body: { title: 'Card A, renamed', priority: 3 } });
  await hit('card, edit bad due', 'PATCH', c, { as: owner, body: { dueAt: 'x' } });
  await hit('card, stale precondition', 'PATCH', c, { as: owner, body: { title: 'x', expectedUpdatedAt: '2001-01-01T00:00:00.000Z' } });
  await hit('card, wrong method', 'PUT', c, { as: owner, body: {} });
  await hit('card, move', 'POST', `${c}/move`, { as: owner, body: { toStageKey: 'inbox' } });
  await hit('card, move unknown', 'POST', `${c}/move`, { as: owner, body: { toStageKey: 'nowhere' } });
  await hit('card, move wrong method', 'GET', `${c}/move`, { as: owner });
  await hit('card, resume not waiting', 'POST', `${c}/resume`, { as: owner, body: { comment: 'go' } });
  await hit('card, resume bad body', 'POST', `${c}/resume`, { as: owner, body: {} });
  await hit('card, resume as an agent', 'POST', `${c}/resume`, { as: bot, body: { comment: 'go' } });
  await hit('card, resume wrong method', 'GET', `${c}/resume`, { as: owner });
  await hit('comments', 'GET', `${c}/comments`, { as: owner });
  await hit('comment, bad', 'POST', `${c}/comments`, { as: owner, body: {} });
  const comment = await hit('comment', 'POST', `${c}/comments`, { as: owner, body: { body: 'Looks right.' } });
  await hit('comment, by an agent with no run', 'POST', `${c}/comments`, { as: bot, body: { body: 'hi' } });
  await hit('comments, wrong method', 'PUT', `${c}/comments`, { as: owner, body: {} });
  await hit('comment, edit refused', 'PATCH', `${c}/comments/${str(comment, 'comment', 'id')}`, { as: owner, body: {} });
  await hit('comment, delete', 'DELETE', `${c}/comments/${str(comment, 'comment', 'id')}`, { as: owner });
  await hit('comment, delete missing', 'DELETE', `${c}/comments/cmt_nothing`, { as: owner });
  const other = await hit('card B', 'POST', `${b}/cards`, { as: owner, body: { title: 'Card B' } });
  await hit('link, bad kind', 'POST', `${b}/links`, { as: owner, body: { fromCardId: str(card, 'card', 'id'), toCardId: str(other, 'card', 'id'), kind: 'x' } });
  await hit('link', 'POST', `${b}/links`, { as: owner, body: { fromCardId: str(card, 'card', 'id'), toCardId: str(other, 'card', 'id'), kind: 'blocks' } });
  await hit('link, cross-board to nowhere', 'POST', `${b}/links`, { as: owner, body: { fromCardId: str(card, 'card', 'id'), toCardId: 'card_0000000000000000', toBoardId: 'brd_0000000000000000', kind: 'relates' } });
  await hit('card links', 'GET', `${c}/links`, { as: owner });
  await hit('link, remove', 'DELETE', `${b}/links`, { as: owner, body: { fromCardId: str(card, 'card', 'id'), toCardId: str(other, 'card', 'id'), kind: 'blocks' } });
  await hit('links, wrong method', 'GET', `${b}/links`, { as: owner });
  await hit('card, split', 'POST', `${c}/split`, { as: owner, body: { titles: ['- [ ] First', 'Second'] } });
  await hit('card, split nothing', 'POST', `${c}/split`, { as: owner, body: { titles: [' '] } });
  await hit('references, set', 'PUT', `${c}/references`, { as: owner, body: { url: 'https://example.com/doc', title: 'Doc' } });
  await hit('references, bad provider', 'PUT', `${c}/references`, { as: owner, body: { url: 'https://example.com/x', provider: 'nope' } });
  await hit('attempts', 'GET', `${c}/attempts`, { as: owner });
  await hit('activities', 'GET', `${c}/activities`, { as: owner });
  await hit('estimate', 'GET', `${c}/estimate`, { as: owner });
  await hit('card, as an agent', 'GET', c, { as: bot });
  await hit('card, as a coordinator', 'GET', c, { as: coord });
  await hit('card, a coordinator edits', 'PATCH', c, { as: coord, body: { priority: 1 } });
  await hit('card, a coordinator moves', 'POST', `${c}/move`, { as: coord, body: { toStageKey: 'inbox' } });
  await hit('card, a coordinator may not delete', 'DELETE', c, { as: coord });
  await hit('comments, as a coordinator', 'GET', `${c}/comments`, { as: coord });
  await hit('attempts, as a coordinator', 'GET', `${c}/attempts`, { as: coord });
  await hit('link, as a coordinator', 'POST', `${b}/links`, { as: coord, body: { fromCardId: str(card, 'card', 'id'), toCardId: str(other, 'card', 'id'), kind: 'relates' } });
  await hit('events, a coordinator bearer is a person route', 'GET', `${b}/events`, { as: coord });

  // ----- board reads and settings -----
  await hit('events', 'GET', `${b}/events`, { as: owner, query: '?limit=3' });
  await hit('usage', 'GET', `${b}/usage`, { as: owner, query: '?window=7d' });
  const notes = await hit('notifications', 'GET', `${b}/notifications`, { as: owner });
  await hit('notification, read', 'POST', `${b}/notifications/${num(notes, 'notifications', 0, 'seq') ?? 1}/read`, { as: owner });
  await hit('notification, not a number', 'POST', `${b}/notifications/x/read`, { as: owner });
  await hit('profiles', 'GET', `${b}/profiles`, { as: owner });
  await hit('profile', 'POST', `${b}/profiles`, { as: owner, body: { key: 'fast', name: 'Fast', capabilities: ['research'] } });
  await hit('profile, refused', 'POST', `${b}/profiles`, { as: owner, body: { key: '' } });
  await hit('schedules', 'GET', `${b}/schedules`, { as: owner });
  await hit('schedule, refused', 'POST', `${b}/schedules`, { as: owner, body: { title: 'Bad', rule: 'whenever' } });
  const sched = await hit('schedule', 'POST', `${b}/schedules`, { as: owner, body: { title: 'Digest', rule: 'daily at 09:00', timezone: 'UTC' } });
  const schedId = str(sched, 'schedule', 'id');
  await hit('schedule, edit', 'PATCH', `${b}/schedules/${schedId}`, { as: owner, body: { title: 'Digest 2' } });
  await hit('schedule, delete', 'DELETE', `${b}/schedules/${schedId}`, { as: owner });
  await hit('schedule, delete missing', 'DELETE', `${b}/schedules/sch_nothing`, { as: owner });
  await hit('schedules, wrong method', 'PUT', `${b}/schedules`, { as: owner, body: {} });
  await hit('push dispatch, nothing queued', 'POST', `${b}/push/dispatch`, { as: owner });
  await hit('push deliveries', 'GET', `${b}/push/deliveries`, { as: owner });
  await hit('stale settings', 'PUT', `${b}/stale`, { as: owner, body: { enabled: true, afterHours: 4 } });
  await hit('stale settings, bad', 'PUT', `${b}/stale`, { as: owner, body: { afterHours: -1 } });
  await hit('budget', 'PUT', `${b}/budget`, { as: owner, body: { boardUsdCap: 100, cardUsdCap: 5 } });
  await hit('budget, an agent bearer on a person route', 'PUT', `${b}/budget`, { as: bot, body: {} });
  await hit('github', 'PUT', `${b}/github`, { as: owner, body: { secret: 'gh-shh', issueTrigger: true } });
  await hit('forge, no secret', 'PUT', `${b}/forge`, { as: owner, body: {} });
  await hit('forge', 'PUT', `${b}/forge`, { as: owner, body: { secret: 'forge-shh' } });
  await hit('trigger', 'POST', `${b}/triggers`, { as: owner, body: { title: 'From a trigger', source: { url: 'https://github.com/o/r/issues/7', provider: 'github', sourceType: 'issue', externalId: '7' } } });
  await hit('webhook forge, no tenant', 'POST', `${b}/webhooks/forge`, { raw: '{}' });
  await hit('webhook forge, unsigned', 'POST', `${b}/webhooks/forge`, { query: `?tenant=${owner['X-Tenant-Id']}`, raw: '{}' });
  await hit('webhook github, bad signature', 'POST', `${b}/webhooks/github`, { query: `?tenant=${owner['X-Tenant-Id']}`, raw: '{}', as: { 'X-Hub-Signature-256': 'sha256=00', 'X-GitHub-Event': 'issues' } });
  await hit('webhook github, wrong method', 'GET', `${b}/webhooks/github`, { query: `?tenant=${owner['X-Tenant-Id']}` });

  // ----- claims and runs -----
  const rc = await hit('card to research', 'POST', `${b}/cards`, { as: owner, body: { title: 'Research this', stageKey: 'research' } });
  await hit('claim, signed out', 'POST', `${b}/claims`, { body: {} });
  await hit('claim, a person', 'POST', `${b}/claims`, { as: { Authorization: 'Bearer nope' }, body: {} });
  await hit('claim, not an object', 'POST', `${b}/claims`, { as: bot, body: [1] });
  await hit('claim, bad concurrency', 'POST', `${b}/claims`, { as: bot, body: { maxConcurrency: 0 } });
  const claim = await hit('claim', 'POST', `${b}/claims`, { as: bot, body: {} });
  await hit('claim, nothing left', 'POST', `${b}/claims`, { as: bot, body: {} });
  await hit('claims, wrong method', 'GET', `${b}/claims`, { as: bot });
  const r = `${b}/runs/${str(claim, 'runId')}`;
  const lease = { leaseEpoch: num(claim, 'leaseEpoch') };
  await hit('run', 'GET', r, { as: bot });
  await hit('run, missing', 'GET', `${b}/runs/run_0000000000000000`, { as: bot });
  await hit('run attempts', 'GET', `${r}/attempts`, { as: bot });
  await hit('run, a person', 'GET', r, { as: owner });
  await hit('run evidence, no service', 'GET', `${r}/evidence`, { as: bot });
  await hit('run evidence v1, no service', 'GET', `${r}/evidence-v1`, { as: owner });
  await hit('evidence reference, bad', 'POST', `${r}/evidence-reference`, { as: bot, body: {} });
  await hit('evidence reference', 'POST', `${r}/evidence-reference`, { as: bot, body: { ...lease, cardId: str(rc, 'card', 'id'), stageKey: 'research', export_id: '0b6e2f8e-3c1a-4d2b-9f7e-1a2b3c4d5e6f', manifest_sha256: 'a'.repeat(64) } });
  await hit('approval subject verify, bad', 'POST', `${r}/approval-subject/verify`, { as: bot, body: {} });
  await hit('approval subject verify, nothing to verify', 'POST', `${r}/approval-subject/verify`, { as: bot, body: { ...lease, expectedSchema: 's', expectedSubjectId: 'x', expectedDigest: `sha256:${'b'.repeat(64)}`, expectedAccount: 'acct' } });
  await hit('heartbeat', 'POST', `${r}/heartbeat`, { as: bot, body: lease });
  await hit('heartbeat, stale lease', 'POST', `${r}/heartbeat`, { as: bot, body: { leaseEpoch: 99 } });
  await hit('activity', 'POST', `${r}/activities`, { as: bot, body: { ...lease, type: 'thought', body: 'Reading' } });
  await hit('question', 'POST', `${r}/activities`, { as: bot, body: { ...lease, type: 'elicitation', body: 'Which source?', signal: 'select', parameter: { options: [{ name: 'a', title: 'A' }, { name: 'b', title: 'B' }] } } });
  const pending = await hit('questions pending, an agent', 'GET', `${b}/elicitations/pending`, { as: bot });
  await hit('questions pending, a person', 'GET', `${b}/elicitations/pending`, { as: owner });
  await hit('answer, missing', 'POST', `${b}/elicitations/eli_nothing/answer`, { as: owner, body: { option: 'a' } });
  await hit('answer', 'POST', `${b}/elicitations/${str(pending, 'elicitations', 0, 'elicitationId')}/answer`, { as: owner, body: { option: 'a' } });
  await hit('answer, wrong method', 'GET', `${b}/elicitations/x/answer`, { as: owner });
  await hit('run reference, bad provider', 'POST', `${r}/references`, { as: bot, body: { ...lease, url: 'https://x', provider: 'nope' } });
  await hit('run reference', 'POST', `${r}/references`, { as: bot, body: { ...lease, url: 'https://github.com/o/r/pull/1', title: 'PR 1' } });
  await hit('run, unknown action', 'POST', `${r}/dance`, { as: bot, body: lease });
  await hit('run, not JSON', 'POST', `${r}/heartbeat`, { as: bot, raw: '{' });
  await hit('run action, wrong method', 'GET', `${r}/heartbeat`, { as: bot });
  await hit('complete into review', 'POST', `${r}/complete`, { as: bot, body: { ...lease, handoff: { summary: 'Two sources.' } } });

  // ----- gates -----
  const gates = await hit('gates pending, a person', 'GET', `${b}/gates/pending`, { as: owner });
  await hit('gates pending, an agent', 'GET', `${b}/gates/pending`, { as: bot });
  const g = str(gates, 'gates', 0, 'gateId');
  await hit('gate', 'GET', `${b}/gates/${g}`, { as: bot });
  await hit('gate, missing', 'GET', `${b}/gates/gate_nothing`, { as: owner });
  await hit('gate, signed out', 'GET', `${b}/gates/${g}`);
  await hit('gate delivery, bad mode', 'POST', `${b}/gates/${g}/delivery`, { as: owner, body: { mode: 'x' } });
  await hit('gate delivery', 'POST', `${b}/gates/${g}/delivery`, { as: owner, body: { mode: 'manual' } });
  await hit('gate resolve, an agent', 'POST', `${b}/gates/${g}/resolve`, { as: bot, body: { decision: 'approve' } });
  await hit('gate resolve', 'POST', `${b}/gates/${g}/resolve`, { as: owner, body: { decision: 'approve', comment: 'Fine' } });
  await hit('gate resolve, again', 'POST', `${b}/gates/${g}/resolve`, { as: owner, body: { decision: 'approve' } });
  await hit('gate resolve, wrong method', 'GET', `${b}/gates/${g}/resolve`, { as: owner });
  await hit('deliveries pending, an agent', 'GET', `${b}/deliveries/pending`, { as: bot });
  await hit('deliveries pending, a person', 'GET', `${b}/deliveries/pending`, { as: owner });
  await hit('deliveries pending, signed out', 'GET', `${b}/deliveries/pending`);
  await hit('board, unknown subpath', 'GET', `${b}/nothing`, { as: owner });
  await hit('board, unknown deep subpath', 'POST', `${b}/a/b/c`, { as: owner, body: {} });

  // ----- roles on a board -----
  const rb = await hit('board in the roles workspace', 'POST', '/v1/boards', { as: ownerOfR, body: { name: 'Roles', stages: STAGES } });
  await hit('board, as the viewer', 'GET', `/v1/boards/${str(rb, 'boardId')}`, { as: viewer });
  await hit('board, the viewer may not create a card', 'POST', `/v1/boards/${str(rb, 'boardId')}/cards`, { as: viewer, body: { title: 'x' } });
  await hit('board, the viewer may not rename', 'PATCH', `/v1/boards/${str(rb, 'boardId')}`, { as: viewer, body: { name: 'x' } });
  await hit('board, a member may not change the budget', 'PUT', `/v1/boards/${str(rb, 'boardId')}/budget`, { as: viewer, body: {} });
  await hit('board, a dev header naming nobody', 'GET', `/v1/boards/${str(rb, 'boardId')}`, { as: bare });
  await hit('board, another workspace', 'GET', `/v1/boards/${str(rb, 'boardId')}`, { as: owner });
  await hit('push config, no agent', 'POST', `/v1/boards/${str(rb, 'boardId')}/push-configs`, { as: ownerOfR, body: { url: 'https://agent.example.com/push', token: 't' } });
  await hit('push config, a service name', 'POST', `/v1/boards/${str(rb, 'boardId')}/push-configs`, { as: { ...ownerOfR, 'X-Agent-Id': 'svc:x' }, body: {} });
  await hit('push config', 'POST', `/v1/boards/${str(rb, 'boardId')}/push-configs`, { as: { ...ownerOfR, 'X-Agent-Id': 'agt_push' }, body: { url: 'https://agent.example.com/push', token: 't', events: ['gate.pending'] } });
  await hit('push config, bad events', 'POST', `/v1/boards/${str(rb, 'boardId')}/push-configs`, { as: { ...ownerOfR, 'X-Agent-Id': 'agt_push' }, body: { url: 'https://agent.example.com/push', token: 't', events: 'x' } });
  await hit('push config, by its agent', 'POST', `/v1/boards/${str(rb, 'boardId')}/push-configs`, { as: bot, body: { url: 'http://127.0.0.1/push', token: 't' } });
  await hit('board, delete', 'DELETE', `/v1/boards/${str(rb, 'boardId')}`, { as: ownerOfR });
  await hit('board, delete the first', 'DELETE', b, { as: owner });
  await hit('board, after delete', 'GET', b, { as: owner });
}
