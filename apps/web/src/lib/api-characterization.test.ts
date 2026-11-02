import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';
import { forgetHubToken } from './hub-token';

/**
 * What the web app's API client sends and answers, pinned before `lib/api.ts` splits by resource
 * (docs/contributor/modularity-plan.md, Phase 5).
 *
 * Every exported function, called with representative arguments against a fake `fetch` that
 * answers 200, 401, 404, 500, or not at all (offline). Each run records every request made (the
 * URL, method, headers, body, credentials mode, and whether it can be aborted), what the function
 * returned or threw, and how many times the lost-session handler fired. The hub-token exchange a
 * write makes first (`/hub/token`) always answers with a live token, so the Authorization it adds
 * is in the record too. Plus the module's export surface, by name and kind.
 *
 * The record is a committed snapshot written against the code before the split; it is never
 * regenerated to make a restructuring pass.
 */
const NOW = Date.UTC(2030, 0, 2, 3, 4, 5);
const HUB_JWT = `header.${btoa(JSON.stringify({ exp: Math.floor(NOW / 1000) + 3600 })).replace(/=+$/, '')}.signature`;

type Mode = 200 | 401 | 404 | 500 | 'offline';
const MODES: Mode[] = [200, 401, 404, 500, 'offline'];

/** One plausible body for every read: each function takes the key it reads. */
const BODY = {
  ok: true,
  boardId: 'brd_1',
  boards: [{ id: 'brd_1', name: 'Ops' }],
  events: [{ seq: 1, type: 'card.created', payload: {}, ts: '2030-01-01T00:00:00Z' }],
  schedules: [{ id: 'sch_1', title: 'Standup' }],
  comments: [{ id: 'cmt_1', body: 'hi' }],
  attempts: [{ runId: 'run_1' }],
  notifications: [{ seq: 3 }],
  user: { id: 'usr_1', name: 'Asha' },
  agents: [{ id: 'agt_1', name: 'Builder' }],
  members: [{ userId: 'usr_1', role: 'owner' }],
  implications: [{ from: 'a', to: 'b' }],
  capabilities: [{ id: 'cap_1', key: 'code' }],
  labels: [{ id: 'lbl_1', name: 'bug' }],
  projects: [{ id: 'prj_1', name: 'Launch' }],
  project: { id: 'prj_1', name: 'Launch' },
  milestones: [{ id: 'mil_1', name: 'Beta' }],
  rollup: { cards: 3, partial: false, boardsUnanswered: 0 },
  tenant: { id: 'tnt_1', externalId: null },
  forgeHost: 'forge.example',
  profiles: [{ key: 'default' }],
  links: [{ fromCardId: 'crd_1', toCardId: 'crd_2', kind: 'blocks' }],
  externalLinks: [],
  token: 'spa_secret',
  tokenId: 'tok_1',
  cards: [{ cardId: 'crd_1' }],
  boardsUnanswered: 0,
};

interface Sent {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  credentials: string | null;
  abortable: boolean;
}

let sent: Sent[];
let fired: number;
let mode: Mode;

function headerRecord(h: HeadersInit | undefined): Record<string, string> {
  if (h === undefined) return {};
  if (h instanceof Headers || Array.isArray(h)) return Object.fromEntries(new Headers(h));
  return Object.fromEntries(Object.entries(h));
}

const urlOf = (input: RequestInfo | URL): string => (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  forgetHubToken();
  sent = [];
  fired = 0;
  api.setUnauthorizedHandler(() => {
    fired++;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = urlOf(input);
      sent.push({
        url,
        method: init?.method ?? 'GET',
        headers: headerRecord(init?.headers),
        body: typeof init?.body === 'string' ? init.body : null,
        credentials: init?.credentials ?? null,
        abortable: init?.signal !== undefined,
      });
      if (url === '/hub/token') return new Response(JSON.stringify({ token: HUB_JWT, hubConfigured: true, signIn: 'github' }), { status: 200 });
      if (mode === 'offline') throw new TypeError('Failed to fetch');
      return new Response(JSON.stringify(mode === 200 ? BODY : { error: `refused (${mode})` }), { status: mode });
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** What a call came to: a Response by its status, a value as it is, a throw by its name and fields. */
async function outcome(call: () => Promise<unknown>): Promise<unknown> {
  try {
    const value = await call();
    if (value instanceof Response) return { response: value.status };
    return { value: value === undefined ? '(undefined)' : value };
  } catch (e) {
    if (e instanceof Error) return { thrown: e.name, message: e.message, ...('status' in e ? { status: e.status } : {}) };
    return { thrown: String(e) };
  }
}

const STAGE: api.Stage = { key: 'todo', name: 'To do', order: 0, ownerKind: 'human' };

/** Every function that makes a request, with representative arguments. */
const CALLS: Array<[string, () => Promise<unknown>]> = [
  ['getBoardEvents', () => api.getBoardEvents('brd_1')],
  ['getBoardEvents limit', () => api.getBoardEvents('brd_1', 5)],
  ['getSchedules', () => api.getSchedules('brd_1')],
  ['createSchedule', () => api.createSchedule('brd_1', { title: 'S', rule: 'daily', timezone: 'UTC', overlap: 'skip', stageKey: null, priority: 1, labels: ['lbl_1'], spec: { a: 1 } })],
  ['updateSchedule', () => api.updateSchedule('brd_1', 'sch_1', { enabled: false })],
  ['deleteSchedule', () => api.deleteSchedule('brd_1', 'sch_1')],
  ['createBoard', () => api.createBoard('New', [STAGE])],
  ['getBoard', () => api.getBoard('brd_1')],
  ['createCard', () => api.createCard('brd_1', 'Ship')],
  ['createCard detail', () => api.createCard('brd_1', 'Ship', { priority: 2, spec: { goal: 'x' }, dueAt: '2030-03-04', stageKey: 'todo', labelIds: ['lbl_1'], projectId: null })],
  ['splitCard', () => api.splitCard('brd_1', 'crd_1', ['a', 'b'])],
  ['updateCard', () => api.updateCard('brd_1', 'crd_1', { title: 'T', labelNames: ['bug'], dueAt: null, projectId: 'prj_1', milestoneId: null })],
  ['setStages', () => api.setStages('brd_1', [STAGE])],
  ['patchStage', () => api.patchStage('brd_1', 'to do/x', { name: 'N', instructions: null, wipLimit: 3 })],
  ['deleteCard', () => api.deleteCard('brd_1', 'crd_1')],
  ['archiveCard', () => api.archiveCard('brd_1', 'crd_1')],
  ['unarchiveCard', () => api.unarchiveCard('brd_1', 'crd_1')],
  ['addLink', () => api.addLink('brd_1', 'crd_1', 'crd_2', 'blocks')],
  ['addLink cross-board', () => api.addLink('brd_1', 'crd_1', 'crd_9', 'relates', 'brd_2')],
  ['removeLink', () => api.removeLink('brd_1', 'crd_1', 'crd_2', 'parent')],
  ['removeLink cross-board', () => api.removeLink('brd_1', 'crd_1', 'crd_9', 'supersedes', 'brd_2')],
  ['listLinks', () => api.listLinks('brd_1', 'crd_1')],
  ['getComments', () => api.getComments('brd_1', 'crd_1')],
  ['postComment', () => api.postComment('brd_1', 'crd_1', 'hello')],
  ['deleteComment', () => api.deleteComment('brd_1', 'crd_1', 'cmt_1')],
  ['addReference', () => api.addReference('brd_1', 'crd_1', { url: 'https://example.com/pr/1', title: 'PR' })],
  ['moveCard', () => api.moveCard('brd_1', 'crd_1', 'build')],
  ['getAttempts', () => api.getAttempts('brd_1', 'crd_1')],
  ['getCardActivities', () => api.getCardActivities('brd_1', 'crd_1')],
  ['getNotifications', () => api.getNotifications('brd_1')],
  ['markNotificationRead', () => api.markNotificationRead('brd_1', 3)],
  ['resumeCard', () => api.resumeCard('brd_1', 'crd_1', 'fixed')],
  ['resumeCard to stage', () => api.resumeCard('brd_1', 'crd_1', 'again', 'todo')],
  ['listAttention', () => api.listAttention()],
  ['resolveGate', () => api.resolveGate('brd_1', 'gat_1', 'approve')],
  ['resolveGate subject', () => api.resolveGate('brd_1', 'gat_1', 'request_changes', 'rename', { id: 'aps_1', digest: 'sha256:x' })],
  ['updateApprovalDelivery mode', () => api.updateApprovalDelivery('brd_1', 'gat_1', { mode: 'manual' })],
  ['updateApprovalDelivery url', () => api.updateApprovalDelivery('brd_1', 'gat_1', { liveUrl: 'https://example.com' })],
  ['answerElicitation', () => api.answerElicitation('brd_1', 'eli_1', { option: 'yes', text: 'sure' })],
  ['getMe', () => api.getMe()],
  ['renewSession', () => api.renewSession()],
  ['logout', () => api.logout()],
  ['getBoards', () => api.getBoards()],
  ['createAgent', () => api.createAgent('Builder', ['code'])],
  ['createAgent linked', () => api.createAgent('Builder', ['code'], 'prn_0123456789abcdef0123', { concurrency: 2 })],
  ['getHubPrincipals', () => api.getHubPrincipals()],
  ['setBudget', () => api.setBudget('brd_1', { boardUsdCap: 10, cardUsdCap: null })],
  ['getEstimate', () => api.getEstimate('brd_1', 'crd_1')],
  ['getUsage', () => api.getUsage('brd_1')],
  ['getUsage 5h', () => api.getUsage('brd_1', '5h')],
  ['getAgents', () => api.getAgents()],
  ['renameBoard', () => api.renameBoard('brd_1', 'Renamed')],
  ['deleteBoard', () => api.deleteBoard('brd_1')],
  ['setGithubConfig', () => api.setGithubConfig('brd_1', { secret: 's', issueTrigger: true })],
  ['getProfiles', () => api.getProfiles('brd_1')],
  ['createProfile', () => api.createProfile('brd_1', { key: 'fast', name: 'Fast', model: 'm', capabilities: ['code'] })],
  ['deleteAgent', () => api.deleteAgent('agt_1')],
  ['setAgentPrincipal', () => api.setAgentPrincipal('agt_1', null)],
  ['updateAgent', () => api.updateAgent('agt_1', { name: 'B', capabilities: ['code'], iconUrl: null, concurrency: 1 })],
  ['issueAgentToken', () => api.issueAgentToken('agt_1')],
  ['issueAgentToken scopes', () => api.issueAgentToken('agt_1', ['claim', 'run'])],
  ['getMembers', () => api.getMembers()],
  ['addMember', () => api.addMember('a@example.com', 'member')],
  ['addMember named', () => api.addMember('a@example.com', 'admin', 'Asha')],
  ['setMemberRole', () => api.setMemberRole('usr_1', 'viewer')],
  ['removeMember', () => api.removeMember('usr_1')],
  ['getImplications', () => api.getImplications()],
  ['addImplication', () => api.addImplication('code', 'review')],
  ['removeImplication', () => api.removeImplication('code review', 'a&b')],
  ['getCapabilities', () => api.getCapabilities()],
  ['createCapability', () => api.createCapability({ key: 'code', name: 'Code', description: 'Writes code.' })],
  ['updateCapability', () => api.updateCapability('cap_1', { description: null, tags: ['t'], examples: [], externalId: null, externalSource: null })],
  ['deleteCapability', () => api.deleteCapability('cap_1')],
  ['listLabels', () => api.listLabels()],
  ['createLabel', () => api.createLabel({ name: 'bug', colour: 'red' })],
  ['updateLabel', () => api.updateLabel('lbl_1', { colour: 'blue' })],
  ['deleteLabel', () => api.deleteLabel('lbl_1')],
  ['listProjects', () => api.listProjects()],
  ['getProject', () => api.getProject('prj_1')],
  ['createProject', () => api.createProject({ name: 'Launch', description: 'd', targetDate: '2030-02-01', leadUserId: 'usr_1', health: 'on-track' })],
  ['updateProject', () => api.updateProject('prj_1', { state: 'paused', health: null })],
  ['deleteProject', () => api.deleteProject('prj_1')],
  ['createMilestone', () => api.createMilestone('prj_1', { name: 'Beta', targetDate: '2030-01-15', sortOrder: 1 })],
  ['updateMilestone', () => api.updateMilestone('mil_1', { targetDate: null })],
  ['deleteMilestone', () => api.deleteMilestone('mil_1')],
  ['getProjectRollup', () => api.getProjectRollup('prj_1')],
  ['getWorkspace', () => api.getWorkspace()],
  ['getForgeHost', () => api.getForgeHost()],
  ['setForgeHost', () => api.setForgeHost(null)],
  ['setWorkspaceFleet', () => api.setWorkspaceFleet('flt_1')],
  ['revokeAgentToken', () => api.revokeAgentToken('agt_1', 'tok_1')],
];

describe('the API client, pinned', () => {
  it('exports the same names, of the same kinds', () => {
    // The snapshot orders the keys.
    const surface = Object.fromEntries(Object.entries(api).map(([k, v]) => [k, typeof v]));
    expect(surface).toMatchSnapshot();
  });

  it.each(CALLS)('%s', async (_name, call) => {
    const record: Record<string, unknown> = {};
    for (const m of MODES) {
      mode = m;
      forgetHubToken();
      sent = [];
      fired = 0;
      const result = await outcome(call);
      record[String(m)] = { requests: sent, result, unauthorizedFired: fired };
    }
    expect(record).toMatchSnapshot();
  });

  it('noteAuth fires the handler on a 401 only, and hands the response back', () => {
    const answers = [200, 401, 403, 500].map((status) => {
      fired = 0;
      const res = new Response(null, { status });
      return { status, same: api.noteAuth(res) === res, fired };
    });
    expect(answers).toMatchSnapshot();
  });

  it('parseGateConflict reads only a decided 409', async () => {
    const cases: Array<[number, unknown]> = [
      [409, { error: { code: 'GATE_NOT_PENDING', reason: 'decided', decidedBy: 'usr_1', decidedAt: '2030-01-01T00:00:00Z', via: 'matrix' } }],
      [409, { error: { code: 'GATE_NOT_PENDING', reason: 'decided', via: 'telegram' } }],
      [409, { error: { code: 'GATE_NOT_PENDING', reason: 'expired' } }],
      [409, { error: { code: 'OTHER' } }],
      [409, 'not json'],
      [400, { error: { code: 'GATE_NOT_PENDING', reason: 'decided' } }],
    ];
    const answers = [];
    for (const [status, body] of cases) {
      const res = new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
      answers.push({ status, body, conflict: await api.parseGateConflict(res), bodyStillReadable: (await res.text()).length > 0 });
    }
    expect(answers).toMatchSnapshot();
  });

  it('openBoardSocket opens the board feed and hands on each event, or null', () => {
    const opened: string[] = [];
    const listeners: Array<(e: { data: unknown }) => void> = [];
    class FakeSocket {
      constructor(url: string) {
        opened.push(url);
      }
      addEventListener(_type: string, fn: (e: { data: unknown }) => void): void {
        listeners.push(fn);
      }
    }
    vi.stubGlobal('WebSocket', FakeSocket);
    vi.stubGlobal('location', { protocol: 'https:', host: 'work.example' });
    const got: unknown[] = [];
    const ws = api.openBoardSocket('brd_1', (e) => got.push(e));
    for (const data of [
      JSON.stringify({ kind: 'snapshot', snapshot: {} }),
      JSON.stringify({ kind: 'event', event: { seq: 4, type: 'activity', payload: { cardId: 'crd_1' }, ts: '2030-01-01T00:00:00Z' } }),
      JSON.stringify({ kind: 'event' }),
      'not json',
    ]) {
      for (const l of listeners) l({ data });
    }
    vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:5173' });
    api.openBoardSocket('brd_2', () => undefined);
    expect({ opened, listeners: listeners.length, got, isFake: ws instanceof FakeSocket }).toMatchSnapshot();
  });
});
