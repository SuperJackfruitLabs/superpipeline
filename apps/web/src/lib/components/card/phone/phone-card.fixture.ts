// apps/web/src/lib/components/card/phone/phone-card.fixture.ts
/**
 * Test-only: card 4605 as a CardModel the phone layouts read (fixtures-and-harness §A, the corrected
 * one-world record, the plan's spec.groups). Only the members the phone layouts touch are filled.
 */
import type { CardModel } from '../card-model.svelte';
import { displayAuthor } from '$lib/names';

export const D4605 = 'not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed.';
export const DESC = 'Reproduce and localize why the existing AgentPod bridge Matrix identities for Message Melissa and Audience Anna do not respond to Ira in Supermessage. Produce an evidence-backed diagnosis and exact repair proposal; do not attribute silence to missing grants without live evidence.';
export const CRITERIA = [
  'Trace user DM ingress, room routing/bridge identity, control-pair authorization, station dispatch, ACP transport/model request and reply delivery; identify the first failing hop for each agent.',
  'Check real current shared-profile servicing rather than stale local gateway_state.json; these profiles are not separately startable.',
  'Check credential availability by presence only; never print .env, tokens or secret files. Profiles were cloned without messaging tokens intentionally because identities are bridge-owned.',
  'Read current AgentPod, Hermes and Accounts contracts/code; do not use retired Fleet grant endpoints or guess API behavior.',
  'Report separately what was reproduced, what cannot be accessed and the exact bounded repair needed; link evidence and preserve tenant/principal boundaries.',
];
export const MEMBERS = [{ userId: 'usr_b19776fac3c94df4', name: 'Ira Mehta', email: 'r@example.test', role: 'owner' }] as never[];
export const AGENTS = [
  { id: 'agt_fx_error_eric', name: 'error-eric', role: 'Diagnostics', externalId: 'prn_fx_error_eric', iconUrl: null },
  { id: 'agt_bb586732b807460c', name: 'super-chotu', role: null, externalId: 'prn_d8178f4a05934b72892a', iconUrl: null },
] as never[];
const STAGES = [['reported', 'Reported'], ['reproduce', 'Reproduce'], ['test', 'Failing test'], ['fix', 'Fix'], ['integrate', 'Integrate'], ['signed-off', 'Signed off'], ['shipped', 'Shipped']] as const;
const GH = 'https://github.com/SuperJackfruitLabs';
const REFS = [
  [`${GH}/agentpod/blob/3f625b618d443aa8ef1dad7c04d3ddd14dcf6708/apps/hub/src/services/matrix-as/inbound.ts#L379-L786`, 'AgentPod v0.1.91 Matrix inbound bridge contract', 'DM ingress → room lookup → Accounts identity/grant → ACP dispatch'],
  [`${GH}/agentpod/blob/3f625b618d443aa8ef1dad7c04d3ddd14dcf6708/apps/hub/src/services/matrix-as/outbound.ts#L373-L486`, 'AgentPod v0.1.91 Matrix reply delivery contract', 'ACP chunks buffered and flushed via bridge-owned Matrix identity'],
  [`${GH}/agentpod/blob/3f625b618d443aa8ef1dad7c04d3ddd14dcf6708/apps/hub/src/services/acp-transport.ts#L90-L248`, 'AgentPod v0.1.91 ACP transport contract', 'acp.open/attach and bidirectional broker framing'],
  [`${GH}/accounts/blob/77ca37e43cd6f98d0799ecbdd230b857404d77ec/src/issuer/claims.ts#L17-L43`, 'Accounts current claims/grant contract', 'Fresh tokens read the stored grant; bridge authorization reads Accounts principal view directly'],
  ['https://github.com/NousResearch/hermes-agent/blob/0b70608a58ac4a8d4505cff15302695350ff6ccc/acp_adapter/server.py#L818-L883', 'Hermes ACP adapter at the reproduced build', 'Hermes streams agent_message_chunk and returns end_turn over ACP stdio'],
].map(([url, title, subtitle], i) => ({ id: `ref_fx_4605_${i + 1}`, cardId: 'card_05823a57e8224605', url, title, subtitle, provider: 'github', sourceType: 'url', addedBy: 'agent' }));

const act = (runId: string, seq: number, type: string, ts: string, extra: Record<string, unknown> = {}) => ({ seq, runId, type, ts, body: null, action: null, parameter: null, result: null, signal: null, ...extra });
const run1 = [
  act('run_fx_4605_1', 1, 'response', '2026-10-08T06:40:00Z', { action: 'Sent back', body: 'The board refused completion: repro and observed were missing.' }),
  ...Array.from({ length: 8 }, (_, i) => act('run_fx_4605_1', i + 2, 'action', `2026-10-08T06:${String(10 + i).padStart(2, '0')}:00Z`, { action: 'read' })),
];
const run2 = [
  act('run_fx_4605_2', 1, 'thought', '2026-10-08T13:20:00Z', { action: 'Started', body: 'Rework run on this card session; read prior persisted evidence first.' }),
  ...Array.from({ length: 12 }, (_, i) => act('run_fx_4605_2', i + 2, 'action', `2026-10-08T13:${String(30 + i).padStart(2, '0')}:00Z`, { action: 'read' })),
  act('run_fx_4605_2', 14, 'response', '2026-10-08T14:11:43Z', { signal: 'stop', body: D4605 }),
];
const counts = (rows: { type: string }[]) => ({ total: rows.length, action: rows.filter((r) => r.type === 'action').length, response: rows.filter((r) => r.type === 'response').length, error: 0 });

export function model4605(): CardModel {
  const stages = STAGES.map(([key, name], order) => ({ key, name, order }));
  const m = {
    boardId: 'brd_134a0ddb6d434478', boardName: 'Developer Experience', stages, allStages: stages, stageIndex: 1, stageName: 'Reproduce', shortId: '4605',
    surface: 'drawer', detailLoaded: true, gate: undefined, elicitation: undefined, archived: false,
    card: {
      id: 'card_05823a57e8224605', title: 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop', state: 'input-required',
      currentStageKey: 'reproduce', priority: 3, dueAt: null, labels: [], ownerUserId: 'usr_b19776fac3c94df4', delegateAgentId: null,
      queuedBy: 'prn_d8178f4a05934b72892a', queuedByAgentId: 'agt_bb586732b807460c', queuedGrantOwner: 'usr_b19776fac3c94df4',
      queuedGrant: Array.from({ length: 32 }, (_, i) => `prn_fx_${i}`), createdAt: '2026-10-08T06:04:57.202Z', stateSince: '2026-10-08T14:11:45Z',
      stageSince: '2026-10-08T06:04:57.202Z', attemptCount: 2, costUsd: 0, archivedAt: null, blockedBy: [], needsHuman: { reason: 'blocked', detail: D4605, summary: 'No fresh DM event to trace; needs one per agent.' },
      spec: {
        description: DESC, acceptanceCriteria: CRITERIA,
        groups: [
          { label: 'What to do', keys: ['rework', 'requiredEvidence'] }, { label: 'Who it is about', keys: ['messageMelissa', 'audienceAnna'] },
          { label: 'Background', keys: ['context', 'latestConfirmedGrant'] }, { label: 'Rules', keys: ['scope', 'accountsIssues'] },
          { label: 'Where work goes', keys: ['repository', 'routingRule'] },
        ],
        rework: 'Previous run ended with interim prose while child traces were pending; board rejected completion because repro and observed were missing. Do not spawn background delegate_task children on this rework: finish the bounded diagnosis in this card session.\n\nKeep the trace inside the card session.',
        requiredEvidence: CRITERIA,
        messageMelissa: { matrixId: '@agent_message-melissa:id.agentpod.dev', card: 'card_f180b1627c594b41' },
        audienceAnna: { matrixId: '@agent_audience-anna:id.agentpod.dev', card: 'card_fa51f3d3e5e94ace' },
        context: "Ira states his own mayDispatch grant already includes both agents and has now added them to Super Chotu's grant. The coordinator station JWT observed immediately after this still contained the original 30-principal list; distinguish token propagation from configured grants.\n\nThe grant change was made before the run.",
        latestConfirmedGrant: 'Super Chotu fresh station JWT now contains both Melissa and Anna principals in mayDispatch (32 total). Token propagation is confirmed; do not continue treating the grant as missing.',
        scope: 'Diagnosis and repair proposal only. No gate decisions, credentials, principal links, grants, board policy, membership, service lifecycle changes or bypasses. No public posts or third-party messages.\n\nAsk before anything else.',
        accountsIssues: 'If the investigation identifies an Accounts implementation defect, raise a GitHub issue in SuperJackfruitLabs/accounts. No confirmed Accounts defect means no speculative issue.\n\nLink the issue from the card.',
        repository: { repo: 'SuperJackfruitLabs/atelier', visibility: 'private', policyUrl: 'https://github.com/SuperJackfruitLabs/atelier/blob/main/AGENTS.md' },
        routingRule: 'Internal artifacts and all Guild work default to Atelier. Verify destination visibility and classification before any push, PR, issue, comment or attachment; never use public fallback.\n\nPrivate first, always.',
      },
    },
    refs: REFS,
    attempts: [
      { runId: 'run_fx_4605_1', agentId: 'agt_fx_error_eric', stageKey: 'reproduce', status: 'completed', outcome: 'completed', costUsd: 0, model: null, profileKey: null, handoff: null, failureReason: 'repro and observed missing', startedAt: '2026-10-08T06:05:00Z', endedAt: '2026-10-08T06:41:00Z', completion: { ok: false, missing: ['repro', 'observed'] } },
      { runId: 'run_fx_4605_2', agentId: 'agt_fx_error_eric', stageKey: 'reproduce', status: 'input-required', outcome: 'blocked', costUsd: 0, model: null, profileKey: null, handoff: null, failureReason: null, startedAt: '2026-10-08T13:20:00Z', endedAt: '2026-10-08T14:11:43Z', completion: null },
    ],
    activityGroups: [
      { runId: 'run_fx_4605_1', stageKey: 'reproduce', agentId: 'agt_fx_error_eric', outcome: 'completed', startedAt: run1[0].ts, activities: run1, counts: counts(run1) },
      { runId: 'run_fx_4605_2', stageKey: 'reproduce', agentId: 'agt_fx_error_eric', outcome: 'blocked', startedAt: run2[0].ts, activities: run2, counts: counts(run2) },
    ],
    estimate: null, projectName: 'Marketing & Community — Melissa and Anna onboarding', milestoneName: null, acceptanceCriteria: CRITERIA, labels: [], ageHours: 66.15,
    lead: { kind: 'stopped', needsYou: true, agentId: null, sentence: D4605, source: 'needs-human', at: '2026-10-08T14:11:45Z' },
    agent: { id: 'agt_fx_error_eric', name: 'error-eric', iconUrl: null, mood: 'needs' },
    delegate: { id: null, name: '', iconUrl: null, mood: 'resting' },
    provenance: { known: true, queuedByName: 'super-chotu', byAgent: true, agent: { id: 'agt_bb586732b807460c', name: 'super-chotu', iconUrl: null }, grantSize: 32, grantCoversDelegate: null },
    counts: { criteria: 5, planSteps: 0, specFields: 10, runs: 2, links: 0, children: 0, openChildren: 0, decisions: 0, refs: 5, attempts: 2, deliveryActive: false, description: true, handoff: false, cost: false },
    handoff: null, related: { phase: 'ready', items: [] }, decidedGates: [], children: [],
    linkGroups: { blockedBy: [], resolvedBlockedBy: [], blocks: [], relates: [], supersedes: [], advisory: [] },
    members: MEMBERS, agents: AGENTS, cardUsdCap: null, principalName: () => '', authorName: (a: { kind: 'human' | 'agent'; id: string; name: string | null }) => displayAuthor(a, MEMBERS, AGENTS), projects: [], allLabels: [], showToolCalls: false, localError: null, archiving: false, copied: null,
    edit: { editing: false, title: '', priority: 3, desc: '', ac: '', due: '', labels: [], saving: false, start() {}, async save() {}, cancel() {} },
    project: { start() {} },
    links: { openAdd() {}, async remove() {} },
    subtasks: { title: '', adding: false, error: null, async add() {} },
    refsForm: { url: '', async add() {} },
    comments: { comments: [], loaded: true, draft: '', posting: false, error: null, async submit() {}, async remove() {} },
    resume: {
      show: true, target: 'reproduce', note: '', error: null, busy: false, async submit() {},
      targets: stages.map((s, i) => ({ key: s.key, n: i + 1, name: s.name, current: i === 1, allowed: i <= 1 })),
    },
    async archive() {}, async restore() {}, async remove() {}, async copyId() {},
  };
  return m as unknown as CardModel;
}
