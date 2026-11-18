// apps/web/src/lib/fixtures/realistic.ts — test data only.
/**
 * One realistic workspace, shaped like production on 2026-11-18, for every page rebuild to be tested
 * against. An empty board hides most real problems (long titles, hundreds of notifications, a seven-
 * stage pipeline, a full Inbox), so composition work is measured here instead.
 *
 * What it holds:
 * - Planning & Roadmap: 13 cards need a person. One review, one question, one card over its budget
 *   cap, and ten unclaimed cards in Idea, a stage no agent works. The budget card sits in Idea too
 *   (it was sent back after it spent past its cap), so the workspace feed counts it as unclaimed
 *   while a board reads it as over budget: 11 cards wait in Idea either way.
 * - Developer Experience: the seven-stage pipeline (Reported … Shipped), 3 reported cards nobody
 *   claims and 13 shipped.
 * - Marketing & Community: 1 card whose agent stopped (blocked) and 1 unclaimed.
 * - 548 notifications across the three boards; titles up to 110 characters.
 *
 * Deterministic: fixed ids, names and times, every time measured back from `REALISTIC_NOW_MS`.
 * `e2e/support/realistic-inbox.ts` seeds this same workspace into the dev API.
 * No runtime imports: the e2e seed loads this file outside the app's module graph.
 */
import type { AgentSummary, BoardSnapshot, Card, Elicitation, Gate, Notification, Stage, UsageSummary } from '$lib/api';

export const REALISTIC_NOW = '2026-11-18T09:00:00.000Z';
export const REALISTIC_NOW_MS = Date.parse(REALISTIC_NOW);
export const REALISTIC_TENANT = 'tnt_realistic';
export const REALISTIC_USER = 'usr_rl_owner';
/** The one model every run in this workspace reports. */
export const REALISTIC_MODEL = 'model-standard';
/** Every board's per-card cap, in USD: the budget card is the one card at or past it. */
export const REALISTIC_CARD_CAP_USD = 5;
export const REALISTIC_BOARD_IDS = { planning: 'brd_rl_planning', devex: 'brd_rl_devex', marketing: 'brd_rl_marketing' } as const;

/** Tokens a card's one usage record reports for its cost: the seed writes the same numbers. */
export function usageTokens(costUsd: number): { inputTokens: number; outputTokens: number } {
  return { inputTokens: Math.round(costUsd * 180_000), outputTokens: Math.round(costUsd * 24_000) };
}

const ago = (hours: number): string => new Date(REALISTIC_NOW_MS - hours * 3_600_000).toISOString();
const STALE = { enabled: true, afterHours: 24 };
const GATE_OPTIONS = [
  { name: 'approve', title: 'Approve' },
  { name: 'request_changes', title: 'Request changes', interactive: true },
  { name: 'reject', title: 'Reject' },
];

// ---------- agents ----------
const AGENT_ROWS: Array<[slug: string, caps: string[], role: string | null]> = [
  ['strategy-sam', ['planning'], 'Planning'],
  ['analyst-echo', ['analysis'], null],
  ['error-eric', ['diagnostics'], 'Diagnostics'],
  ['tester-tim', ['testing'], null],
  ['coder-kai', ['code'], null],
  ['integration-ian', ['integration'], null],
  ['writer-quill', ['writing'], null],
  ['message-melissa', ['marketing'], null],
];
export const agentIdOf = (slug: string): string => `agt_rl_${slug.replace(/-/g, '_')}`;

// ---------- cards ----------
interface Spec {
  n: number;
  title: string;
  stage: string;
  state: 'submitted' | 'working' | 'input-required' | 'completed';
  /** Hours since the card entered this state. */
  since: number;
  agent?: string;
  attempts?: number;
  costUsd?: number;
  priority?: number;
  needs?: Card['needsHuman'];
}

function toCard(boardKey: string, s: Spec): Card {
  const cost = s.costUsd ?? 0;
  const since = ago(s.since);
  return {
    id: `card_rl_${boardKey}_${String(s.n).padStart(3, '0')}`,
    title: s.title,
    spec: null,
    ownerUserId: REALISTIC_USER,
    currentStageKey: s.stage,
    state: s.state,
    priority: s.priority ?? 0,
    costUsd: cost,
    overBudget: cost >= REALISTIC_CARD_CAP_USD,
    attemptCount: s.attempts ?? (s.agent ? 1 : 0),
    delegateAgentId: null,
    lastAgentId: s.agent ? agentIdOf(s.agent) : null,
    queuedGrantOwner: null,
    stageSince: since,
    createdAt: ago(s.since + 6 + s.n),
    queuedBy: REALISTIC_USER,
    queuedByAgentId: null,
    queuedGrant: null,
    labels: [],
    dueAt: null,
    archivedAt: null,
    parentCardId: null,
    openChildCount: 0,
    costUsdRollup: cost,
    blockedBy: [],
    projectId: null,
    milestoneId: null,
    ...(s.needs ? { needsHuman: s.needs } : {}),
    stateSince: since,
  };
}

const PLANNING_STAGES: Stage[] = [
  { key: 'idea', name: 'Idea', order: 0, ownerKind: 'human', summary: 'Someone writes down what the product should do next.' },
  { key: 'shape', name: 'Shape', order: 1, ownerKind: 'capability', owner: 'planning' },
  { key: 'decide', name: 'Decide', order: 2, ownerKind: 'human', gate: 'approval' },
  { key: 'roadmap', name: 'On the roadmap', order: 3, ownerKind: 'human' },
];

const IDEAS = [
  'Let a workspace owner see every board’s spend for the month on one page, broken down by agent and by stage',
  'Show which stage a card has been waiting in the longest, on the board and in the Inbox, with the reason',
  'Archive finished cards after thirty days without losing their history, references or approval record',
  'One weekly digest of what shipped, what is stuck and what needs a decision, sent to every workspace owner',
  'Import an existing GitHub project board as a pipeline, keeping its columns, labels and open issues',
  'Let an agent propose a new stage when the same hand-off keeps failing at the one after it on a board',
  'Search across every board’s cards, comments and hand-offs from the command palette, with filters',
  'Budget alerts that warn at eighty percent of a card’s cap instead of only stopping it at the cap',
  'Give milestones a burn-down that counts cards by stage rather than by open or closed, per project',
  'Make the stage summary editable from the board header without opening the pipeline settings page',
];

const planningCards: Spec[] = [
  { n: 1, title: 'Decide whether the roadmap’s first quarter leads with self-serve onboarding or with the workspace audit trail', stage: 'decide', state: 'input-required', since: 5, agent: 'strategy-sam', attempts: 2, costUsd: 1.84, priority: 2 },
  { n: 2, title: 'Shape the pricing page: which plan includes approval gates, how many boards each plan allows, what is metered', stage: 'shape', state: 'input-required', since: 3, agent: 'strategy-sam', costUsd: 0.92, priority: 1 },
  { n: 3, title: 'Research how teams split a pipeline across two boards and whether a card should be able to move between them', stage: 'idea', state: 'submitted', since: 52, agent: 'analyst-echo', attempts: 3, costUsd: 6.4 },
  ...IDEAS.map((title, i): Spec => ({ n: 4 + i, title, stage: 'idea', state: 'submitted', since: 30 + i * 31 })),
  { n: 14, title: 'Shape the agent hand-off format so every stage can read the previous stage’s evidence', stage: 'shape', state: 'working', since: 1, agent: 'strategy-sam', costUsd: 0.31 },
  { n: 15, title: 'Shape the public changelog: one entry per release, written for people who do not read code', stage: 'shape', state: 'submitted', since: 8 },
  { n: 16, title: 'Board templates for the five most common pipelines', stage: 'roadmap', state: 'completed', since: 120, agent: 'strategy-sam', costUsd: 2.1 },
  { n: 17, title: 'Keyboard shortcuts for moving a card between stages', stage: 'roadmap', state: 'completed', since: 160, agent: 'strategy-sam', costUsd: 0.75 },
  { n: 18, title: 'Due dates and an overdue notice on every card', stage: 'roadmap', state: 'completed', since: 220, agent: 'strategy-sam', costUsd: 1.2 },
];

const REPORTED = [
  'The board page scrolls sideways on a phone when a card title has a URL with no spaces, and the rail disappears',
  'Resuming a stopped card with a note drops the note when the agent’s run had ended before the resume arrived',
  'The stage picker lists archived stages after a pipeline edit until a reload, and a move there fails silently',
];
const SHIPPED = [
  'Notifications page loads every notification at once and freezes on a board with several hundred of them',
  'A card moved by hand into Signed off skips the approval gate instead of opening one',
  'Usage totals double-count a run that posted the same usage twice after a reconnect',
  'The Inbox badge counts archived cards until the next full reload of the workspace',
  'Long stage names push the Move button off the card on narrow screens',
  'The reproduce stage’s hand-off loses its evidence links when they contain a query string with an ampersand',
  'Question answers sent from a phone arrive twice when the network drops mid-send',
  'Board switcher shows a stale needs-you count after a card is approved elsewhere',
  'The failing-test stage accepts a hand-off with no test path in it',
  'A rename of a board does not reach the open tabs that show its name until they reload',
  'Dark theme draws the gate summary in the same colour as its background on the Studio vibe',
  'The integrate stage returns a card to Fix without saying which check failed',
  'Exported card history leaves out comments made after the card shipped',
];
const devexCards: Spec[] = [
  ...REPORTED.map((title, i): Spec => ({ n: 1 + i, title, stage: 'reported', state: 'submitted', since: 26 + i * 19, priority: i === 0 ? 2 : 0 })),
  ...SHIPPED.map((title, i): Spec => ({
    n: 4 + i, title, stage: 'shipped', state: 'completed', since: 40 + i * 23,
    agent: ['coder-kai', 'integration-ian', 'tester-tim', 'error-eric'][i % 4], attempts: 4 + (i % 3), costUsd: Number((1.1 + (i % 5) * 0.37).toFixed(2)),
  })),
];

const MARKETING_STAGES: Stage[] = [
  { key: 'ideas', name: 'Ideas', order: 0, ownerKind: 'human' },
  { key: 'draft', name: 'Draft', order: 1, ownerKind: 'capability', owner: 'writing' },
  { key: 'edit', name: 'Edit', order: 2, ownerKind: 'human', gate: 'approval' },
  { key: 'publish', name: 'Publish', order: 3, ownerKind: 'capability', owner: 'marketing' },
  { key: 'published', name: 'Published', order: 4, ownerKind: 'human' },
];
const STOPPED_DETAIL = 'Stopped before posting: the scheduled post links to a release page that returns 404. Publish the release page or give me a different link, then resume this card.';
const marketingCards: Spec[] = [
  {
    n: 1, title: 'Publish the launch thread for the audit trail, with the three screenshots and the link to the release notes',
    stage: 'publish', state: 'input-required', since: 9, agent: 'message-melissa', attempts: 2, costUsd: 0.64, priority: 1,
    needs: { reason: 'blocked', detail: STOPPED_DETAIL, summary: 'The release page link is a 404.' },
  },
  { n: 2, title: 'Write a short post on what we learned running thirty agents on one workspace for a month, with the numbers', stage: 'ideas', state: 'submitted', since: 75 },
  { n: 3, title: 'Monthly community update for October', stage: 'published', state: 'completed', since: 400, agent: 'writer-quill', costUsd: 0.88 },
  { n: 4, title: 'Thank-you post for the first hundred self-serve workspaces', stage: 'published', state: 'completed', since: 300, agent: 'writer-quill', costUsd: 0.52 },
];

const DEVEX_STAGES: Stage[] = [
  { key: 'reported', name: 'Reported', order: 0, ownerKind: 'human', instructions: 'Describe one problem a developer hit. What you did, what happened, what you expected.' },
  { key: 'reproduce', name: 'Reproduce', order: 1, ownerKind: 'capability', owner: 'diagnostics' },
  { key: 'test', name: 'Failing test', order: 2, ownerKind: 'capability', owner: 'testing' },
  { key: 'fix', name: 'Fix', order: 3, ownerKind: 'capability', owner: 'code' },
  { key: 'integrate', name: 'Integrate', order: 4, ownerKind: 'capability', owner: 'integration' },
  { key: 'signed-off', name: 'Signed off', order: 5, ownerKind: 'human', gate: 'approval' },
  { key: 'shipped', name: 'Shipped', order: 6, ownerKind: 'human' },
];

// ---------- notifications ----------
const NOTIFICATION_COUNTS = { planning: 302, devex: 211, marketing: 35 } as const;

function notificationsFor(cards: Card[], stages: Stage[], count: number, offsetMin: number): Notification[] {
  const stageName = (key: string) => stages.find((s) => s.key === key)?.name ?? key;
  const out: Notification[] = [];
  // Oldest first, as the board's sequence numbers run; one every 47 minutes back from now.
  for (let i = 0; i < count; i++) {
    const card = cards[(i * 7) % cards.length];
    const age = (count - i) * 47 + offsetMin;
    const kind = ['stale', 'blocked', 'gate', 'rework', 'question', 'stale', 'overdue'][i % 7];
    const body =
      kind === 'stale' ? `Stuck ${24 + (i % 5) * 12}h in ${stageName(card.currentStageKey)}: “${card.title}”. Next: move it to a stage someone works`
      : kind === 'blocked' ? `Waiting on a person in ${stageName(card.currentStageKey)}`
      : kind === 'gate' ? `“${card.title}” is waiting for your review`
      : kind === 'rework' ? 'Sent back for one automatic rework: the hand-off is missing its evidence'
      : kind === 'question' ? 'The agent asked a question and is waiting for an answer'
      : `“${card.title}” was due ${new Date(REALISTIC_NOW_MS - age * 60_000).toISOString().slice(0, 10)}`;
    out.push({ seq: i + 1, kind, cardId: card.id, body, read: i < count - 40, createdAt: new Date(REALISTIC_NOW_MS - age * 60_000).toISOString() });
  }
  return out;
}

// ---------- usage ----------
const round = (n: number): number => Number(n.toFixed(2));
const day = (d: number): string => new Date(REALISTIC_NOW_MS - d * 86_400_000).toISOString().slice(0, 10);

function usageFor(cards: Card[]): UsageSummary {
  const spent = cards.filter((c) => c.costUsd > 0);
  const total = round(spent.reduce((n, c) => n + c.costUsd, 0));
  const tokens = spent.map((c) => usageTokens(c.costUsd));
  const byAgent = new Map<string, number>();
  for (const c of spent) {
    const agent = c.lastAgentId ?? '';
    byAgent.set(agent, round((byAgent.get(agent) ?? 0) + c.costUsd));
  }
  const inputTokens = tokens.reduce((n, t) => n + t.inputTokens, 0);
  const outputTokens = tokens.reduce((n, t) => n + t.outputTokens, 0);
  const byDay = Array.from({ length: 7 }, (_, i) => {
    const d = day(6 - i);
    return { day: d, costUsd: round(spent.filter((c) => c.stageSince.slice(0, 10) === d).reduce((n, c) => n + c.costUsd, 0)) };
  });
  return {
    totalCostUsd: total,
    estimatedCostUsd: 0,
    totalInputTokens: inputTokens,
    totalOutputTokens: outputTokens,
    unpricedRecords: 0,
    byModel: spent.length ? [{ model: REALISTIC_MODEL, costUsd: total, inputTokens, outputTokens }] : [],
    byAgent: [...byAgent].map(([agentId, costUsd]) => ({ agentId, costUsd })).toSorted((a, b) => b.costUsd - a.costUsd),
    byCard: spent.map((c) => ({ cardId: c.id, costUsd: c.costUsd })).toSorted((a, b) => b.costUsd - a.costUsd),
    byDay,
  };
}

// ---------- boards ----------
function board(id: string, name: string, stages: Stage[], cards: Card[], gates: Gate[], elicitations: Elicitation[]): BoardSnapshot {
  const total = Number(cards.reduce((n, c) => n + c.costUsd, 0).toFixed(2));
  return {
    boardId: id,
    tenantId: REALISTIC_TENANT,
    name,
    stages,
    cards,
    gates,
    elicitations,
    references: [],
    usage: { totalCostUsd: total, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: REALISTIC_CARD_CAP_USD, overBudget: false },
    github: { issueTrigger: false, webhookConfigured: false, webhookUrl: `https://api.example.invalid/v1/boards/${id}/github`, triggerGrantCount: null },
    stale: STALE,
  };
}

export function realisticWorkspace(): {
  boards: BoardSnapshot[];
  agents: AgentSummary[];
  notifications: Record<string, Notification[]>;
  usage: Record<string, UsageSummary>;
} {
  const ids = REALISTIC_BOARD_IDS;
  const pCards = planningCards.map((s) => toCard('planning', s));
  const dCards = devexCards.map((s) => toCard('devex', s));
  const mCards = marketingCards.map((s) => toCard('marketing', s));
  const review = pCards[0];
  const asked = pCards[1];
  const gate: Gate = {
    id: 'gate_rl_planning_001', cardId: review.id, stageKey: 'decide', status: 'pending', options: GATE_OPTIONS,
    producedBy: agentIdOf('strategy-sam'), decision: null, decidedBy: null, comment: null, resolvedAt: null,
    summary: 'Recommend leading with self-serve onboarding: 41 of the last 60 sign-ups stalled before their first board, and the audit trail has no paying asks yet.',
    references: [],
  };
  const question: Elicitation = {
    id: 'elc_rl_planning_002', cardId: asked.id, runId: `run_rl_${asked.id.slice(8)}_1`, stageKey: 'shape', agentId: agentIdOf('strategy-sam'),
    question: 'Should approval gates be on every plan, or only on Team and above? The comparison table reads differently either way, so I need one answer before I draft it.',
    signal: null, options: [], status: 'pending', answer: null, createdAt: asked.stageSince,
  };
  const boards = [
    board(ids.planning, 'Planning & Roadmap', PLANNING_STAGES, pCards, [gate], [question]),
    board(ids.devex, 'Developer Experience', DEVEX_STAGES, dCards, [], []),
    board(ids.marketing, 'Marketing & Community', MARKETING_STAGES, mCards, [], []),
  ];
  const all = boards.flatMap((b) => b.cards);
  const agents: AgentSummary[] = AGENT_ROWS.map(([slug, capabilities, role]) => {
    const id = agentIdOf(slug);
    const held = all.filter((c) => c.lastAgentId === id && (c.state === 'working' || c.id === asked.id));
    return {
      id, name: slug, role, capabilities, claimedCount: held.length, workingCount: held.filter((c) => c.state === 'working').length,
      externalId: `prn_rl_${slug.replace(/-/g, '_')}`, externalSource: 'agentpod', iconUrl: null, concurrency: 1,
      tokenIds: [`tok_fx_${slug.replace(/-/g, '_')}_1`],
    };
  });
  return {
    boards,
    agents,
    notifications: {
      [ids.planning]: notificationsFor(pCards, PLANNING_STAGES, NOTIFICATION_COUNTS.planning, 0),
      [ids.devex]: notificationsFor(dCards, DEVEX_STAGES, NOTIFICATION_COUNTS.devex, 11),
      [ids.marketing]: notificationsFor(mCards, MARKETING_STAGES, NOTIFICATION_COUNTS.marketing, 23),
    },
    usage: Object.fromEntries(boards.map((b) => [b.boardId ?? '', usageFor(b.cards)])),
  };
}
