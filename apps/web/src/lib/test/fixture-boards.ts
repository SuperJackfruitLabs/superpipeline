// apps/web/src/lib/test/fixture-boards.ts
/**
 * The pixel fixture world (`e2e/pixel/fixture/world.ts`, BASE_WORLD) as the web client receives it at
 * 2026-10-11T08:21:00Z: the Developer Experience, Agent Onboarding and Production Releases snapshots,
 * the 22 agents, the label catalogue and the one member. Unit tests of board derivations read these,
 * so a test's expected string is the reference artboard's string. Keep it in step with world.ts.
 */
import type { AgentSummary, BoardSnapshot, Card, Member, Reference, Stage } from '$lib/api';

export const NOW_MS = Date.parse('2026-10-11T08:21:00Z');
export const ME = { id: 'usr_b19776fac3c94df4', name: 'Rakesh Gangwar', initials: 'RG' } as const;
export const MEMBERS: Member[] = [{ userId: ME.id, email: 'owner@fixture.invalid', name: ME.name, role: 'owner', createdAt: '2026-09-01T00:00:00Z' }];

const AGENT_ROWS: Array<[string, string[]]> = [
  ['research-ray', ['research']], ['optimizer-ollie', ['code']], ['writer-quill', ['writing']], ['strategy-sam', ['planning']],
  ['predictor-paul', ['analysis']], ['analyst-echo', ['analysis', 'claim-check']], ['cleaner-cody', ['maintenance']], ['coder-kai', ['code']],
  ['project-manager-pete', ['planning']], ['controller-casey', ['planning']], ['super-chotu', ['command']], ['threat-hunter-theo', ['security']],
  ['onboarding-olivia', ['onboarding']], ['artistic-lyra', ['design']], ['chaos-charlie', ['resilience']], ['tester-tim', ['testing']],
  ['error-eric', ['diagnostics']], ['integration-ian', ['integration']], ['api-alan', ['api']], ['devops-dave', ['release']],
  ['vulnerability-victor', ['security-review']], ['message-melissa', ['marketing']],
];
export const agentId = (slug: string): string => (slug === 'super-chotu' ? 'agt_bb586732b807460c' : `agt_fx_${slug.replace(/-/g, '_')}`);
export const AGENTS: AgentSummary[] = AGENT_ROWS.map(([name, capabilities]) => ({
  id: agentId(name),
  name,
  capabilities,
  externalId: name === 'super-chotu' ? 'prn_d8178f4a05934b72892a' : `prn_fx_${name.replace(/-/g, '_')}`,
  externalSource: 'agentpod',
  iconUrl: null,
  concurrency: 1,
  tokenIds: [],
  role: null,
  claimedCount: 0,
  workingCount: 0,
}));

export const LABELS = new Map<string, { name: string; colour: string }>([
  ['lbl_0259a14014754f69', { name: 'clean-room', colour: 'var(--vk-mood-thinking)' }],
  ['lbl_e9ccaacaa2f94509', { name: 'evidence-required', colour: 'var(--vk-mood-done)' }],
  ['lbl_8430ce51795447c3', { name: 'superpipeline', colour: 'var(--vk-mood-working)' }],
]);

const CHOTU = { queuedBy: 'prn_d8178f4a05934b72892a', queuedByAgentId: 'agt_bb586732b807460c' };

function card(over: Partial<Card> & Pick<Card, 'id' | 'title' | 'currentStageKey' | 'state'>): Card {
  const since = over.stateSince ?? '2026-10-11T08:00:00Z';
  return {
    spec: null, ownerUserId: ME.id, priority: 0, costUsd: 0, overBudget: false, attemptCount: 0, delegateAgentId: null,
    queuedBy: ME.id, queuedByAgentId: null, queuedGrant: null, labels: [], dueAt: null, archivedAt: null, parentCardId: null,
    openChildCount: 0, costUsdRollup: 0, blockedBy: [], projectId: null, milestoneId: null, lastAgentId: null,
    queuedGrantOwner: null, createdAt: '2026-10-01T00:00:00Z', ...over, stateSince: since, stageSince: since,
  };
}
const ref = (id: string, cardId: string, title: string): Reference => ({ id, cardId, url: `https://fixture.invalid/${id}`, title, provider: 'github', sourceType: 'commit', addedBy: 'agent' });
const USAGE0 = { totalCostUsd: 0, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: null, overBudget: false } as unknown as BoardSnapshot['usage'];
const GITHUB0 = { issueTrigger: false, webhookConfigured: false, triggerGrantCount: null, webhookUrl: 'https://api.superpipeline.dev/v1/github/webhook' } as BoardSnapshot['github'];

export const DX_IDS = {
  c63ac: 'card_ace250c9c25363ac', c58f8: 'card_9ac2116a050858f8', c1dfc: 'card_e10fb4fe39a91dfc', cf83f: 'card_691a65ff9894f83f',
  c481f: 'card_482b4aa0bdd6481f', c9ed9: 'card_8f2c1a5e58299ed9', c4605: 'card_05823a57e8224605',
} as const;
const T = {
  c58f8: 'AgentPod: connector interface and generic effects ledger, state machine and executor',
  c1dfc: 'Superpipeline: manual-delivery completion and approval-subject hardening',
  c481f: 'agentpod-connectors: X connector (connector x)',
};
export const DETAIL_58F8 = 'Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim\'s station write access. The matching URL ssh://git@forge.superjackfruit.com:2222/SuperJackfruitLabs/agentpod.git authenticates as tester-tim and is readable, but push is refused with “Mirror Repository SuperJackfruitLabs/agentpod is read-only”. Local red-test commit 7a444f3a and verbatim failure evidence are preserved at https://app.superlibrary.dev/a/itm_569034f61d1b4b1a; no GitHub push was attempted.';
export const DETAIL_1DFC = 'this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit';
export const DETAIL_4605 = 'not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed.';

const DX_STAGES: Stage[] = [
  { key: 'reported', name: 'Reported', order: 0, ownerKind: 'human' },
  { key: 'reproduce', name: 'Reproduce', order: 1, ownerKind: 'capability', owner: 'diagnostics' },
  { key: 'test', name: 'Failing test', order: 2, ownerKind: 'capability', owner: 'testing' },
  { key: 'fix', name: 'Fix', order: 3, ownerKind: 'capability', owner: 'code' },
  { key: 'integrate', name: 'Integrate', order: 4, ownerKind: 'capability', owner: 'integration', requires: { any: ['integration', 'api', 'testing'] } },
  { key: 'signed-off', name: 'Signed off', order: 5, ownerKind: 'human', gate: 'approval' },
  { key: 'shipped', name: 'Shipped', order: 6, ownerKind: 'human' },
];

export const DX: BoardSnapshot = {
  boardId: 'brd_134a0ddb6d434478', tenantId: 'tnt_vibes', name: 'Developer Experience', stages: DX_STAGES,
  cards: [
    card({ id: DX_IDS.c4605, title: 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop', currentStageKey: 'reproduce', state: 'input-required', priority: 3, attemptCount: 2, ...CHOTU, projectId: 'prj_42ab5ec961104f65', createdAt: '2026-10-08T17:55:00.000Z', stateSince: '2026-10-08T14:11:45.119Z', lastAgentId: agentId('error-eric'), needsHuman: { reason: 'blocked', detail: DETAIL_4605, summary: 'No fresh DM event to trace; needs one per agent.' } }),
    card({ id: DX_IDS.c9ed9, title: 'Build immutable approval subjects and digest-bound gates', currentStageKey: 'shipped', state: 'completed', priority: 2, attemptCount: 15, projectId: 'prj_34b48f840daa4309', createdAt: '2026-10-08T10:31:32.526Z', stateSince: '2026-10-09T22:19:24.419Z', lastAgentId: agentId('coder-kai') }),
    card({ id: DX_IDS.c58f8, title: T.c58f8, currentStageKey: 'test', state: 'input-required', priority: 2, attemptCount: 1, ...CHOTU, projectId: 'prj_34b48f840daa4309', createdAt: '2026-10-08T10:31:33.618Z', stateSince: '2026-10-09T22:24:49.862Z', lastAgentId: agentId('tester-tim'), needsHuman: { reason: 'blocked', detail: DETAIL_58F8, summary: 'Needs a writable Forge URL for agentpod.' } }),
    card({ id: DX_IDS.cf83f, title: 'Integrate editorial workflows and prove no-write publishing acceptance', currentStageKey: 'test', state: 'submitted', priority: 2, ...CHOTU, projectId: 'prj_34b48f840daa4309', createdAt: '2026-10-08T10:31:34.691Z', stateSince: '2026-10-08T17:50:23.062Z', blockedBy: [{ cardId: DX_IDS.c481f, title: T.c481f }, { cardId: DX_IDS.c58f8, title: T.c58f8 }, { cardId: DX_IDS.c1dfc, title: T.c1dfc }] }),
    card({ id: DX_IDS.c63ac, title: 'Fix the highest-severity blocker found in the clean-room journey', currentStageKey: 'reported', state: 'submitted', priority: 1, dueAt: '2026-10-06', ...CHOTU, labels: ['lbl_0259a14014754f69', 'lbl_e9ccaacaa2f94509', 'lbl_8430ce51795447c3', 'lbl_c5ee8f164fb54eb0'], projectId: 'prj_23b93f2d16d54b27', createdAt: '2026-10-04T10:19:08.402Z', stateSince: '2026-10-08T09:51:01.514Z' }),
    card({ id: DX_IDS.c1dfc, title: T.c1dfc, currentStageKey: 'fix', state: 'input-required', priority: 0, attemptCount: 5, createdAt: '2026-10-08T17:50:41.154Z', stateSince: '2026-10-09T22:45:45.522Z', lastAgentId: agentId('coder-kai'), needsHuman: { reason: 'blocked', detail: DETAIL_1DFC, failureCount: 2, summary: 'Missing commit ×2.' } }),
    card({ id: 'card_47630a307f58426f', title: 'Scratch: forge push identity check (integration-ian)', currentStageKey: 'integrate', state: 'input-required', attemptCount: 1, archivedAt: '2026-10-09T14:21:02.650Z', createdAt: '2026-10-09T14:18:14.596Z', stateSince: '2026-10-09T14:20:11.010Z', lastAgentId: agentId('integration-ian') }),
    card({ id: 'card_54ec7bee6c7e4828', title: 'Scratch: forge push identity check (error-eric)', currentStageKey: 'reproduce', state: 'input-required', attemptCount: 1, archivedAt: '2026-10-09T14:21:04.552Z', createdAt: '2026-10-09T14:18:17.617Z', stateSince: '2026-10-09T14:20:06.788Z', lastAgentId: agentId('error-eric') }),
    card({ id: DX_IDS.c481f, title: T.c481f, currentStageKey: 'test', state: 'submitted', createdAt: '2026-10-09T23:04:35.741Z', stateSince: '2026-10-09T23:04:43.288Z', blockedBy: [{ cardId: DX_IDS.c58f8, title: T.c58f8 }] }),
  ],
  gates: [], elicitations: [],
  references: [
    ref('ref_fx_4605_1', DX_IDS.c4605, 'AgentPod v0.1.91 Matrix inbound bridge contract'),
    ref('ref_fx_9ed9_1', DX_IDS.c9ed9, 'test(api): pin immutable approval subject binding'),
    ref('ref_fx_58f8_1', DX_IDS.c58f8, 'Deterministic X publisher red-test evidence'),
    ref('ref_fx_1dfc_1', DX_IDS.c1dfc, 'test(api): pin manual delivery reminder'),
  ],
  usage: USAGE0, github: GITHUB0, stale: { enabled: true, afterHours: 24 },
};

const OLIVIA = agentId('onboarding-olivia');
const LATER_15 = ['Ulrich', 'Error Handler Eric', 'API Manager Alan', 'Integration Ian', 'Risk Assessment Rachel', 'Tester Tim', 'Knowledge Keeper Karen', 'Architect Alex', 'Knowledge Synthesizer Kevin', 'Data Scientist Diana', 'Benchmark Betty', 'Performance Pete', 'Monitor Mike', 'Vulnerability Victor', 'DevOps Dave'];
const LATER_ATTEMPTS = [6, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 4, 4, 6, 7];
const BLOCKER = { cardId: 'card_e3c7940daca24158', title: 'Operator credentialing repair — Melissa and Anna must respond and prove work' };
const resident = (over: Partial<Card> & Pick<Card, 'id' | 'title'>) => card({ currentStageKey: 'resident', state: 'completed', lastAgentId: OLIVIA, createdAt: '2026-09-25T00:00:00Z', ...over });

export const ONBOARDING: BoardSnapshot = {
  boardId: 'brd_f47143722126442c', tenantId: 'tnt_vibes', name: 'Agent Onboarding',
  stages: [
    { key: 'requested', name: 'Requested', order: 0, ownerKind: 'human' },
    { key: 'drafted', name: 'Drafted', order: 1, ownerKind: 'capability', owner: 'onboarding' },
    { key: 'provisioned', name: 'Provisioned', order: 2, ownerKind: 'capability', owner: 'onboarding' },
    { key: 'portrait', name: 'Portrait', order: 3, ownerKind: 'capability', owner: 'design' },
    { key: 'credentialed', name: 'Credentialed', order: 4, ownerKind: 'human', gate: 'approval' },
    { key: 'proving', name: 'Proving', order: 5, ownerKind: 'capability', owner: 'claim-check', requires: { any: ['claim-check', 'analysis'] } },
    { key: 'resident', name: 'Resident', order: 6, ownerKind: 'human', gate: 'approval' },
  ],
  cards: [
    resident({ id: 'card_9d48db2717044b69', title: 'Run and record the clean-room SuperPipeline operator journey', priority: 1, attemptCount: 10, stateSince: '2026-10-10T12:21:00Z', dueAt: '2026-10-05', projectId: 'prj_23b93f2d16d54b27', labels: ['lbl_0259a14014754f69', 'lbl_e9ccaacaa2f94509', 'lbl_8430ce51795447c3', 'lbl_8f31b566952f4d0f'] }),
    resident({ id: 'card_f180b1627c594b41', title: 'Onboard Message Melissa — marketing and messaging', priority: 2, attemptCount: 5, stateSince: '2026-10-08T13:56:34.688Z', ...CHOTU, blockedBy: [BLOCKER], projectId: 'prj_42ab5ec961104f65' }),
    resident({ id: 'card_fa51f3d3e5e94ace', title: 'Onboard Audience Anna — community and feedback', priority: 2, attemptCount: 5, stateSince: '2026-10-08T13:56:33.362Z', ...CHOTU, blockedBy: [BLOCKER], projectId: 'prj_42ab5ec961104f65' }),
    resident({ id: 'card_94266a0d5c984dc8', title: 'Onboard Artistic Lyra', attemptCount: 5, stateSince: '2026-10-01T22:30:00Z' }),
    resident({ id: 'card_09a6d0a769af4f53', title: 'Onboard Chaos Charlie', attemptCount: 8, stateSince: '2026-10-01T22:20:56.146Z' }),
    ...LATER_15.map((name, i) => resident({ id: `card_fx_onb_${String(i + 1).padStart(2, '0')}`, title: `Onboard ${name}`, attemptCount: LATER_ATTEMPTS[i]!, stateSince: new Date(Date.parse('2026-10-01T21:00:00Z') - (i + 1) * 600_000).toISOString() })),
    card({ id: BLOCKER.cardId, title: BLOCKER.title, currentStageKey: 'requested', state: 'submitted', priority: 3, archivedAt: '2026-10-08T14:11:41.633Z', stateSince: '2026-10-08T14:11:41.633Z' }),
  ],
  gates: [], elicitations: [],
  references: [
    ref('ref_fx_9d48_1', 'card_9d48db2717044b69', 'Clean-room SuperPipeline operator journey — attempt 6 evidence'),
    ref('ref_fx_f180_1', 'card_f180b1627c594b41', 'Message Melissa — pinned Sketchbook persona'),
    ref('ref_fx_fa51_1', 'card_fa51f3d3e5e94ace', 'Audience Anna pinned Sketchbook persona'),
  ],
  usage: USAGE0, github: GITHUB0, stale: { enabled: true, afterHours: 24 },
};

export const RELEASES: BoardSnapshot = {
  boardId: 'brd_2441b5578f704b93', tenantId: 'tnt_vibes', name: 'Production Releases',
  stages: [
    { key: 'proposed', name: 'Proposed', order: 0, ownerKind: 'human', summary: 'Someone writes up the release: what ships and why.' },
    { key: 'staged', name: 'Staged', order: 1, ownerKind: 'capability', owner: 'release', summary: 'Stages the release. Picks up cards that need the release skill.' },
    { key: 'checks', name: 'Checks', order: 2, ownerKind: 'capability', owner: 'security-review', summary: 'Runs the security review before anyone decides.' },
    { key: 'go-no-go', name: 'Go / no-go', order: 3, ownerKind: 'human', gate: 'approval', wipLimit: 1, summary: 'An approval gate. One release at a time waits here for your yes or no.' },
    { key: 'released', name: 'Released', order: 4, ownerKind: 'human', summary: 'A person marks it live. The card is done.' },
  ],
  intro: {
    lede: 'It takes a release from **proposal to production** in five stages. **devops-dave** stages it, **vulnerability-victor** checks it, and **you** give the go or no-go before it is released.',
    composeHint: 'Say what you want released in a sentence; an agent drafts the brief.',
  },
  cards: [], gates: [], elicitations: [], references: [],
  usage: USAGE0, github: GITHUB0, stale: { enabled: true, afterHours: 24 },
};

/** The context PlanView hands `buildBoardModel`, at the fixture clock. */
export const boardCtx = (over: Partial<{ spend7d: number | null }> = {}) => ({
  agents: AGENTS, members: MEMBERS, labels: LABELS, nowMs: NOW_MS, me: { ...ME }, spend7d: 0 as number | null, ...over,
});
