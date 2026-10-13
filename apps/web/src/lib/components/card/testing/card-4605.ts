// apps/web/src/lib/components/card/testing/card-4605.ts
/** Fixture-world values (card 4605 on Developer Experience) in web types. Test-only. */
import type { Activity, AgentSummary, Attempt, BoardSnapshot, Card, Member, Project, Reference, Stage, User } from '$lib/api';

export const NOW = new Date('2026-10-11T08:21:00Z');
export const TZ = 'Asia/Kolkata';
export const USER: User = { userId: 'usr_b19776fac3c94df4', tenantId: 'tnt_vibes', name: 'Rakesh Gangwar' };
export const MEMBERS: Member[] = [{ userId: 'usr_b19776fac3c94df4', email: 'rakesh@fixture.invalid', name: 'Rakesh Gangwar', role: 'owner', createdAt: '2026-09-01T00:00:00Z' }];

const agent = (id: string, name: string, externalId: string): AgentSummary => ({ id, name, capabilities: [], externalId, externalSource: 'accounts', iconUrl: null, concurrency: 1, tokenIds: [], role: null, claimedCount: 0, workingCount: 0 });
export const AGENTS: AgentSummary[] = [
  agent('agt_fx_error_eric', 'error-eric', 'prn_fx_error_eric'),
  agent('agt_bb586732b807460c', 'super-chotu', 'prn_d8178f4a05934b72892a'),
];

export const STAGES_DX: Stage[] = [
  { key: 'reported', name: 'Reported', order: 0 },
  { key: 'reproduce', name: 'Reproduce', order: 1 },
  { key: 'test', name: 'Failing test', order: 2 },
  { key: 'fix', name: 'Fix', order: 3 },
  { key: 'integrate', name: 'Integrate', order: 4 },
  { key: 'signed-off', name: 'Signed off', order: 5, gate: 'approval' },
  { key: 'shipped', name: 'Shipped', order: 6 },
];

export const DETAIL_4605 = 'not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed.';
export const DESCRIPTION_4605 = 'Reproduce and localize why the existing AgentPod bridge Matrix identities for Message Melissa and Audience Anna do not respond to Rakesh in Supermessage. Produce an evidence-backed diagnosis and exact repair proposal; do not attribute silence to missing grants without live evidence.';
export const CRITERIA_4605 = [
  'Trace user DM ingress, room routing/bridge identity, control-pair authorization, station dispatch, ACP transport/model request and reply delivery; identify the first failing hop for each agent.',
  'Check real current shared-profile servicing rather than stale local gateway_state.json; these profiles are not separately startable.',
  'Check credential availability by presence only; never print .env, tokens or secret files. Profiles were cloned without messaging tokens intentionally because identities are bridge-owned.',
  'Read current AgentPod, Hermes and Accounts contracts/code; do not use retired Fleet grant endpoints or guess API behavior.',
  'Report separately what was reproduced, what cannot be accessed and the exact bounded repair needed; link evidence and preserve tenant/principal boundaries.',
];
const MORE = '\n\nThis continuation is only shown after Show more.';
export const VISIBLE = {
  rework: 'Previous run ended with interim prose while child traces were pending; board rejected completion because repro and observed were missing. Do not spawn background delegate_task children on this rework: finish the bounded diagnosis in this card session.',
  context: "Rakesh states his own mayDispatch grant already includes both agents and has now added them to Super Chotu's grant. The coordinator station JWT observed immediately after this still contained the original 30-principal list; distinguish token propagation from configured grants.",
  latestConfirmedGrant: 'Super Chotu fresh station JWT now contains both Melissa and Anna principals in mayDispatch (32 total). Token propagation is confirmed; do not continue treating the grant as missing.',
  scope: 'Diagnosis and repair proposal only. No gate decisions, credentials, principal links, grants, board policy, membership, service lifecycle changes or bypasses. No public posts or third-party messages.',
  accountsIssues: 'If the investigation identifies an Accounts implementation defect, raise a GitHub issue in SuperJackfruitLabs/accounts. No confirmed Accounts defect means no speculative issue.',
  routingRule: 'Internal artifacts and all Guild work default to Atelier. Verify destination visibility and classification before any push, PR, issue, comment or attachment; never use public fallback.',
} as const;
export const SPEC_4605: Record<string, unknown> = {
  description: DESCRIPTION_4605,
  acceptanceCriteria: CRITERIA_4605,
  fieldLabels: { messageMelissa: 'Message Melissa', audienceAnna: 'Audience Anna' },
  groups: [
    { label: 'What to do', keys: ['rework', 'requiredEvidence'] },
    { label: 'Who it is about', keys: ['messageMelissa', 'audienceAnna'] },
    { label: 'Background', keys: ['context', 'latestConfirmedGrant'] },
    { label: 'Rules', keys: ['scope', 'accountsIssues'] },
    { label: 'Where work goes', keys: ['repository', 'routingRule'] },
  ],
  rework: VISIBLE.rework + MORE,
  requiredEvidence: CRITERIA_4605,
  messageMelissa: { matrixId: '@agent_message-melissa:id.agentpod.dev', card: 'card_f180b1627c594b41' },
  audienceAnna: { matrixId: '@agent_audience-anna:id.agentpod.dev', card: 'card_fa51f3d3e5e94ace' },
  context: VISIBLE.context + MORE,
  latestConfirmedGrant: VISIBLE.latestConfirmedGrant,
  scope: VISIBLE.scope + MORE,
  accountsIssues: VISIBLE.accountsIssues + MORE,
  repository: { repo: 'SuperJackfruitLabs/atelier', visibility: 'private', policyUrl: 'https://github.com/SuperJackfruitLabs/atelier/blob/main/AGENTS.md' },
  routingRule: VISIBLE.routingRule + MORE,
};

export const GRANT_4605 = ['prn_fx_error_eric', ...Array.from({ length: 31 }, (_, i) => `prn_fx_grant_${String(i + 1).padStart(2, '0')}`)];

export const CARD_4605: Card = {
  id: 'card_05823a57e8224605',
  title: 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop',
  spec: SPEC_4605,
  ownerUserId: 'usr_b19776fac3c94df4',
  currentStageKey: 'reproduce',
  state: 'input-required',
  priority: 3,
  costUsd: 0,
  overBudget: false,
  attemptCount: 2,
  delegateAgentId: null,
  queuedBy: 'prn_d8178f4a05934b72892a',
  queuedByAgentId: 'agt_bb586732b807460c',
  queuedGrant: GRANT_4605,
  queuedGrantOwner: 'usr_b19776fac3c94df4',
  labels: [],
  dueAt: null,
  archivedAt: null,
  parentCardId: null,
  openChildCount: 0,
  costUsdRollup: 0,
  blockedBy: [],
  projectId: 'prj_42ab5ec961104f65',
  milestoneId: null,
  needsHuman: { reason: 'blocked', detail: DETAIL_4605, summary: 'No fresh DM event to trace; needs one per agent.' },
  stateSince: '2026-10-08T14:11:45.000Z',
  stageSince: '2026-10-08T14:11:45.000Z',
  createdAt: '2026-10-08T17:55:00.000Z',
  lastAgentId: 'agt_fx_error_eric',
};

export const PROJECTS: Project[] = [{ id: 'prj_42ab5ec961104f65', name: 'Marketing & Community — Melissa and Anna onboarding' } as Project];

const ref = (n: number, url: string, title: string, subtitle: string): Reference => ({ id: `ref_fx_4605_${n}`, cardId: CARD_4605.id, url, title, subtitle, provider: 'github', sourceType: 'link', addedBy: 'agent' });
export const REFS_4605: Reference[] = [
  ref(1, 'https://github.com/SuperJackfruitLabs/agentpod/blob/3f625b618d443aa8ef1dad7c04d3ddd14dcf6708/apps/hub/src/services/matrix-as/inbound.ts#L379-L786', 'AgentPod v0.1.91 Matrix inbound bridge contract', 'DM ingress → room lookup → Accounts identity/grant → ACP dispatch'),
  ref(2, 'https://github.com/SuperJackfruitLabs/agentpod/blob/3f625b618d443aa8ef1dad7c04d3ddd14dcf6708/apps/hub/src/services/matrix-as/outbound.ts#L373-L486', 'AgentPod v0.1.91 Matrix reply delivery contract', 'ACP chunks buffered and flushed via bridge-owned Matrix identity'),
  ref(3, 'https://github.com/SuperJackfruitLabs/agentpod/blob/3f625b618d443aa8ef1dad7c04d3ddd14dcf6708/apps/hub/src/services/acp-transport.ts#L90-L248', 'AgentPod v0.1.91 ACP transport contract', 'acp.open/attach and bidirectional broker framing'),
  ref(4, 'https://github.com/SuperJackfruitLabs/accounts/blob/77ca37e43cd6f98d0799ecbdd230b857404d77ec/src/issuer/claims.ts#L17-L43', 'Accounts current claims/grant contract', 'Fresh tokens read the stored grant; bridge authorization reads Accounts principal view directly'),
  ref(5, 'https://github.com/NousResearch/hermes-agent/blob/0b70608a58ac4a8d4505cff15302695350ff6ccc/acp_adapter/server.py#L818-L883', 'Hermes ACP adapter at the reproduced build', 'Hermes streams agent_message_chunk and returns end_turn over ACP stdio'),
];

export const ATTEMPTS_4605: Attempt[] = [
  { runId: 'run_fx_4605_1', agentId: 'agt_fx_error_eric', stageKey: 'reproduce', status: 'ended', outcome: 'completed', costUsd: 0, model: null, profileKey: null, handoff: null, failureReason: 'repro and observed missing', startedAt: '2026-10-08T06:05:10.000Z', endedAt: '2026-10-08T06:41:00.000Z', completion: { ok: false, missing: ['repro', 'observed'] } },
  { runId: 'run_fx_4605_2', agentId: 'agt_fx_error_eric', stageKey: 'reproduce', status: 'ended', outcome: 'blocked', costUsd: 0, model: null, profileKey: null, handoff: null, failureReason: null, startedAt: '2026-10-08T13:20:00.000Z', endedAt: '2026-10-08T14:11:43.000Z', completion: null },
];

const act = (runId: string, seq: number, ts: string, type: string, body: string | null, extra: Partial<Activity> = {}): Activity => ({ seq, runId, type, ts, body, action: null, parameter: null, result: null, signal: null, ...extra });
/** Run 1: 9 events (one narrative). Run 2: 14 events (two narrative, twelve tool calls). */
export const ACTIVITIES_4605: Activity[] = [
  act('run_fx_4605_1', 1, '2026-10-08T06:05:12.000Z', 'response', 'The board refused completion: repro and observed were missing.', { action: 'Sent back' }),
  ...Array.from({ length: 8 }, (_, i) => act('run_fx_4605_1', i + 2, `2026-10-08T06:${String(10 + i * 3).padStart(2, '0')}:00.000Z`, 'action', `Tool call ${i + 1}`, { action: 'read_file' })),
  act('run_fx_4605_2', 1, '2026-10-08T13:20:00.000Z', 'thought', 'Rework run on this card session; read prior persisted evidence first.', { action: 'Started' }),
  ...Array.from({ length: 12 }, (_, i) => act('run_fx_4605_2', i + 2, `2026-10-08T13:${String(22 + i * 3).padStart(2, '0')}:00.000Z`, 'action', `Tool call ${i + 1}`, { action: 'read_file' })),
  act('run_fx_4605_2', 14, '2026-10-08T14:11:43.000Z', 'response', DETAIL_4605, { signal: 'stop' }),
];

export const BOARD_DX: BoardSnapshot = {
  boardId: 'brd_134a0ddb6d434478',
  tenantId: 'tnt_vibes',
  name: 'Developer Experience',
  stages: STAGES_DX,
  cards: [CARD_4605],
  gates: [],
  elicitations: [],
  references: REFS_4605,
  usage: { totalCostUsd: 0, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: null, overBudget: false },
  github: { issueTrigger: false, webhookConfigured: false, triggerGrantCount: null, webhookUrl: '' },
};
