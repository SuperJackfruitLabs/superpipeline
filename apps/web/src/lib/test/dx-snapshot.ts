// apps/web/src/lib/test/dx-snapshot.ts
/**
 * The Developer Experience board as the web client receives it at the fixture clock — the same
 * world `e2e/pixel/fixture/world.ts` imports, shaped as the API types so unit tests can derive
 * exactly what the Operate and List artboards print. Test data only: nothing in the app imports it.
 */
import type { AgentSummary, BoardSnapshot, Card, Label, Member, Notification } from '$lib/api';

export const DX_NOW = Date.parse('2026-10-11T08:21:00Z');
export const DX_ID = 'brd_134a0ddb6d434478';
export const ME = 'usr_b19776fac3c94df4';

export const TEXT_A =
  "Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim's station write access. The matching URL ssh://git@forge.superjackfruit.com:2222/SuperJackfruitLabs/agentpod.git authenticates as tester-tim and is readable, but push is refused with “Mirror Repository SuperJackfruitLabs/agentpod is read-only”. Local red-test commit 7a444f3a and verbatim failure evidence are preserved at https://app.superlibrary.dev/a/itm_569034f61d1b4b1a; no GitHub push was attempted.";
export const TEXT_B =
  'this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit';
export const D5 =
  'not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed.';

const agent = (id: string, name: string, capabilities: string[]): AgentSummary => ({
  id, name, capabilities, externalId: `prn_${id.slice(4)}`, externalSource: 'agentpod', iconUrl: null,
  concurrency: 1, tokenIds: [], role: null, claimedCount: 0, workingCount: 0,
});

export const DX_AGENTS: AgentSummary[] = [
  agent('agt_fx_optimizer_ollie', 'optimizer-ollie', ['code']),
  agent('agt_fx_coder_kai', 'coder-kai', ['code']),
  { ...agent('agt_bb586732b807460c', 'super-chotu', ['command']), externalId: 'prn_d8178f4a05934b72892a' },
  agent('agt_fx_tester_tim', 'tester-tim', ['testing']),
  agent('agt_fx_error_eric', 'error-eric', ['diagnostics']),
  agent('agt_fx_integration_ian', 'integration-ian', ['integration']),
  agent('agt_fx_api_alan', 'api-alan', ['api']),
];

export const DX_MEMBERS: Member[] = [{ userId: ME, email: 'rakesh@fixture.test', name: 'Rakesh Gangwar', role: 'owner', createdAt: '2026-09-01T00:00:00Z' }];

export const DX_LABELS: Label[] = [
  { id: 'lbl_0259a14014754f69', tenantId: 'tnt_vibes', name: 'clean-room', colour: 'var(--vk-mood-thinking)', origin: 'inferred', createdAt: '2026-10-04T10:19:08Z' },
  { id: 'lbl_e9ccaacaa2f94509', tenantId: 'tnt_vibes', name: 'evidence-required', colour: 'var(--vk-mood-done)', origin: 'inferred', createdAt: '2026-10-04T10:19:09Z' },
  { id: 'lbl_8430ce51795447c3', tenantId: 'tnt_vibes', name: 'superpipeline', colour: 'var(--vk-mood-working)', origin: 'inferred', createdAt: '2026-10-04T10:19:10Z' },
];

const CHOTU = { queuedBy: 'prn_d8178f4a05934b72892a', queuedByAgentId: 'agt_bb586732b807460c' };
const card = (over: Partial<Card> & Pick<Card, 'id' | 'title' | 'currentStageKey' | 'state' | 'stateSince'>): Card => ({
  spec: null, ownerUserId: ME, priority: 0, costUsd: 0, overBudget: false, attemptCount: 0, delegateAgentId: null,
  queuedBy: ME, queuedByAgentId: null, queuedGrant: null, labels: [], dueAt: null, archivedAt: null, parentCardId: null,
  openChildCount: 0, costUsdRollup: 0, blockedBy: [], projectId: null, milestoneId: null, lastAgentId: null,
  queuedGrantOwner: null, stageSince: over.stateSince!, createdAt: over.stateSince!, ...over,
});

export const C63AC = card({ id: 'card_ace250c9c25363ac', title: 'Fix the highest-severity blocker found in the clean-room journey', currentStageKey: 'reported', state: 'submitted', priority: 1, dueAt: '2026-10-06', labels: ['lbl_0259a14014754f69', 'lbl_e9ccaacaa2f94509', 'lbl_8430ce51795447c3', 'lbl_c5ee8f164fb54eb0'], stateSince: '2026-10-08T09:51:01.514Z', createdAt: '2026-10-04T10:19:08.402Z', ...CHOTU });
export const C4605 = card({ id: 'card_05823a57e8224605', title: 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop', currentStageKey: 'reproduce', state: 'input-required', priority: 3, attemptCount: 2, lastAgentId: 'agt_fx_error_eric', needsHuman: { reason: 'blocked', detail: D5, summary: 'No fresh DM event to trace; needs one per agent.' }, stateSince: '2026-10-08T14:11:45.119Z', createdAt: '2026-10-08T17:55:00.000Z', ...CHOTU });
export const C58F8 = card({ id: 'card_9ac2116a050858f8', title: 'AgentPod: connector interface and generic effects ledger, state machine and executor', currentStageKey: 'test', state: 'input-required', priority: 2, attemptCount: 1, lastAgentId: 'agt_fx_tester_tim', needsHuman: { reason: 'blocked', detail: TEXT_A, summary: 'Needs a writable Forge URL for agentpod.' }, stateSince: '2026-10-09T22:24:49.862Z', createdAt: '2026-10-08T10:31:33.618Z', ...CHOTU });
export const CF83F = card({ id: 'card_691a65ff9894f83f', title: 'Integrate editorial workflows and prove no-write publishing acceptance', currentStageKey: 'test', state: 'submitted', priority: 2, blockedBy: [{ cardId: 'card_482b4aa0bdd6481f', title: 'agentpod-connectors: X connector (connector x)' }, { cardId: 'card_9ac2116a050858f8', title: 'AgentPod: connector interface and generic effects ledger, state machine and executor' }, { cardId: 'card_e10fb4fe39a91dfc', title: 'Superpipeline: manual-delivery completion and approval-subject hardening' }], stateSince: '2026-10-08T17:50:23.062Z', createdAt: '2026-10-08T10:31:34.691Z', ...CHOTU });
export const C481F = card({ id: 'card_482b4aa0bdd6481f', title: 'agentpod-connectors: X connector (connector x)', currentStageKey: 'test', state: 'submitted', blockedBy: [{ cardId: 'card_9ac2116a050858f8', title: 'AgentPod: connector interface and generic effects ledger, state machine and executor' }], stateSince: '2026-10-09T23:04:43.288Z', createdAt: '2026-10-09T23:04:35.741Z' });
export const C1DFC = card({ id: 'card_e10fb4fe39a91dfc', title: 'Superpipeline: manual-delivery completion and approval-subject hardening', currentStageKey: 'fix', state: 'input-required', attemptCount: 5, lastAgentId: 'agt_fx_coder_kai', needsHuman: { reason: 'blocked', detail: TEXT_B, failureCount: 2, summary: 'Missing commit ×2.' }, stateSince: '2026-10-09T22:45:45.522Z', createdAt: '2026-10-08T17:50:41.154Z' });
export const C9ED9 = card({ id: 'card_8f2c1a5e58299ed9', title: 'Build immutable approval subjects and digest-bound gates', currentStageKey: 'shipped', state: 'completed', priority: 2, attemptCount: 15, lastAgentId: 'agt_fx_coder_kai', stateSince: '2026-10-09T22:19:24.419Z', createdAt: '2026-10-08T10:31:32.526Z' });

export const DX_BOARD: BoardSnapshot = {
  boardId: DX_ID, tenantId: 'tnt_vibes', name: 'Developer Experience',
  stages: [
    { key: 'reported', name: 'Reported', order: 0, ownerKind: 'human' },
    { key: 'reproduce', name: 'Reproduce', order: 1, ownerKind: 'capability', owner: 'diagnostics' },
    { key: 'test', name: 'Failing test', order: 2, ownerKind: 'capability', owner: 'testing' },
    { key: 'fix', name: 'Fix', order: 3, ownerKind: 'capability', owner: 'code' },
    { key: 'integrate', name: 'Integrate', order: 4, ownerKind: 'capability', owner: 'integration', requires: { any: ['integration', 'api', 'testing'] } },
    { key: 'signed-off', name: 'Signed off', order: 5, ownerKind: 'human', gate: 'approval' },
    { key: 'shipped', name: 'Shipped', order: 6, ownerKind: 'human' },
  ],
  // The DO's order (priority DESC, due, created): what arrives over the wire, not what is shown.
  cards: [C4605, C9ED9, C58F8, CF83F, C63AC, C1DFC, C481F],
  gates: [], elicitations: [], references: [],
  usage: { totalCostUsd: 0, estimatedCostUsd: 0, budgetUsd: null, cardUsdCap: null, overBudget: false },
  github: { issueTrigger: false, webhookConfigured: false, triggerGrantCount: null, webhookUrl: 'https://superpipeline.example/v1/github/webhook' },
  stale: { enabled: true, afterHours: 24 },
};

let seq = 0;
const note = (cardId: string, kind: string, body: string, createdAt: string): Notification => ({ seq: ++seq, kind, cardId, body, read: false, createdAt });
export const DX_NOTIFICATIONS: Notification[] = [
  note(C1DFC.id, 'stale', `Stuck 24h in Fix: ${TEXT_B}. Next: resume it`, '2026-10-10T22:50:12Z'),
  note(C1DFC.id, 'blocked', TEXT_B, '2026-10-09T22:45:45Z'),
  note(C1DFC.id, 'rework', 'Sent back for one automatic rework: the handoff is missing commit', '2026-10-09T21:30:01Z'),
  note(C1DFC.id, 'rework', 'Sent back to "fix" from "integrate": REST path fails HTTP 400', '2026-10-09T13:00:01Z'),
  note(C1DFC.id, 'stale', `Stuck 24h in Fix: ${TEXT_B}. Next: resume it`, '2026-10-10T10:50:12Z'),
  note(C58F8.id, 'stale', `Stuck 24h in Failing test: ${TEXT_A} Next: resume it`, '2026-10-10T22:25:12Z'),
  note(C58F8.id, 'blocked', TEXT_A, '2026-10-09T22:24:50Z'),
  note(C58F8.id, 'stale', `Stuck 24h in Failing test: ${TEXT_A} Next: resume it`, '2026-10-10T10:25:12Z'),
  note(C58F8.id, 'control-pair', 'Not dispatched: waiting for a grant that covers tester-tim', '2026-10-08T10:31:40Z'),
  note(C58F8.id, 'blocked', 'Waiting on the Forge destination', '2026-10-09T21:31:00Z'),
  note(C63AC.id, 'stale', 'Stuck 48h in Reported: No agent works this stage and no review is asked for here. Next: move it to a stage someone works', '2026-10-10T09:55:20Z'),
  note(C63AC.id, 'stale', 'Stuck 24h in Reported: No agent works this stage and no review is asked for here. Next: move it to a stage someone works', '2026-10-09T09:55:20Z'),
  note(C63AC.id, 'overdue', '"Fix the highest-severity blocker found in the clean-room journey" was due 2026-10-06', '2026-10-07T00:05:00Z'),
  note(C63AC.id, 'stale', 'Stuck 12h in Reported: No agent works this stage and no review is asked for here. Next: move it to a stage someone works', '2026-10-08T21:55:20Z'),
  note(C63AC.id, 'control-pair', 'Not dispatched: no agent works Reported', '2026-10-04T10:19:10Z'),
  note(C63AC.id, 'blocked', 'Waiting on a person in Reported', '2026-10-08T09:51:02Z'),
  note(C4605.id, 'blocked', D5, '2026-10-08T14:11:46Z'),
  note(C4605.id, 'stale', `Stuck 24h in Reproduce: ${D5} Next: resume it`, '2026-10-09T14:11:50Z'),
  note(C4605.id, 'stale', `Stuck 24h in Reproduce: ${D5} Next: resume it`, '2026-10-10T14:11:50Z'),
];
