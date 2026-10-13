// apps/web/e2e/pixel/fixture/world.ts
import type { FixtureBoard, Row, World } from './types';
import { snapshot, snapshotCard, snapshotRefs } from './snapshots';

export const NOW = '2026-10-11T08:21:00.000Z';
const U = 'usr_b19776fac3c94df4';
const CHOTU = 'agt_bb586732b807460c';
const CHOTU_PRN = 'prn_d8178f4a05934b72892a';
/** One of the captured 4605 grant's principals: the references read "allowed to dispatch the one working it". */
const ERIC_PRN = 'prn_51644819c47d42b2a480';
export const IDS = {
  DX: 'brd_134a0ddb6d434478', AO: 'brd_f47143722126442c', PR: 'brd_2441b5578f704b93', RI: 'brd_fa33a0a0721d4d18',
  MC: 'brd_e247f164e060443f', GUILD: 'brd_af3fde184dd84d90', CQ: 'brd_6c298ec02d6b466b',
  C4605: 'card_05823a57e8224605', C58F8: 'card_9ac2116a050858f8', C1DFC: 'card_e10fb4fe39a91dfc', C63AC: 'card_ace250c9c25363ac',
  CF83F: 'card_691a65ff9894f83f', C481F: 'card_482b4aa0bdd6481f', C9ED9: 'card_8f2c1a5e58299ed9',
  CRI: 'card_42269e99036f42ae', CMEL: 'card_f180b1627c594b41', CANNA: 'card_fa51f3d3e5e94ace', CARCH: 'card_e1eb201927f94506',
  CGUILD1: 'card_fx_af3f_0001',
} as const;

const addMin = (iso: string, m: number) => new Date(Date.parse(iso) + m * 60_000).toISOString().replace('.000Z', 'Z');
const empty = (): FixtureBoard => ({ meta: {}, cards: [], runs: [], activities: [], events: [], notifications: [], gates: [], approvalSubjects: [], elicitations: [], references: [], links: [], comments: [] });

/** A DO `cards` row with the defaults §A.5.2 says every card shares. */
function card(c: Partial<Row> & { id: string; title: string; current_stage_key: string; state: string; created_at: string; state_since: string }): Row {
  return {
    spec_json: '{}', owner_user_id: U, priority: 0, context_id: `ctx_${c.id.slice(5)}`, delegate_agent_id: null, current_run_id: null,
    claim_seq: 0, failure_count: 0, handoff_json: null, updated_at: c.state_since, queued_by: U, queued_by_agent_id: null, queued_grant: null, queued_grant_owner: null, stage_since: c.state_since,
    labels: '[]', due_at: null, overdue_notified_at: null, archived_at: null, pending_advance_json: null, project_id: null,
    needs_human_json: null, milestone_id: null, completion_rework_json: null, auto_returns: 0, stale_notified_at: null,
    active_approval_subject_id: null, ...c,
  };
}
function run(r: { id: string; card_id: string; stage_key: string; agent_id: string; started_at: string; ended_at: string | null; outcome: string | null; n: number; status?: string; completion?: string | null; handoff_json?: string | null; failure_reason?: string | null; queued_by?: string }): Row {
  return {
    id: r.id, card_id: r.card_id, stage_key: r.stage_key, agent_id: r.agent_id, lease_epoch: r.n, status: r.status ?? 'ended', outcome: r.outcome,
    last_heartbeat_ms: Date.parse(r.ended_at ?? r.started_at), started_at: r.started_at, ended_at: r.ended_at, profile_key: null,
    completion: r.completion ?? null, handoff_json: r.handoff_json ?? null, failure_reason: r.failure_reason ?? null, queued_by: r.queued_by ?? U,
    updated_at: r.ended_at ?? r.started_at,
  };
}
const act = (run_id: string, card_id: string, type: string, ts: string, body: string | null, action: string | null = null, detail: Record<string, unknown> = { kind: type === 'action' ? 'TOOL' : 'MESSAGE' }): Row =>
  ({ run_id, card_id, type, ephemeral: 0, body, action, detail_json: JSON.stringify(detail), ts });
const tools = (run_id: string, card_id: string, start: string, every: number, n: number): Row[] =>
  Array.from({ length: n }, (_, i) => act(run_id, card_id, 'action', addMin(start, i * every), null, 'tool', { kind: 'TOOL', tool: ['read_file', 'grep', 'http_get'][i % 3] }));

// ---------- agents (§A.4.2) ----------
const AGENTS: Array<[slug: string, caps: string[], tokens: number, external?: string]> = [
  ['research-ray', ['research'], 5], ['optimizer-ollie', ['code'], 2], ['writer-quill', ['writing'], 2], ['strategy-sam', ['planning'], 2],
  ['predictor-paul', ['analysis'], 2], ['analyst-echo', ['analysis', 'claim-check'], 2], ['cleaner-cody', ['maintenance'], 2], ['coder-kai', ['code'], 6],
  ['project-manager-pete', ['planning'], 2], ['controller-casey', ['planning'], 2], ['super-chotu', ['command'], 1, CHOTU_PRN],
  ['threat-hunter-theo', ['security'], 2], ['onboarding-olivia', ['onboarding'], 2], ['artistic-lyra', ['design'], 2], ['chaos-charlie', ['resilience'], 2],
  ['tester-tim', ['testing'], 2], ['error-eric', ['diagnostics'], 2, ERIC_PRN], ['integration-ian', ['integration'], 2], ['api-alan', ['api'], 2],
  ['devops-dave', ['release'], 2], ['vulnerability-victor', ['security-review'], 2], ['message-melissa', ['marketing'], 1, 'prn_ce6d1efc169a75f2245f'],
];
const agentId = (slug: string) => (slug === 'super-chotu' ? CHOTU : `agt_fx_${slug.replace(/-/g, '_')}`);

// ---------- Developer Experience (§A.5, WC-1, Part 4) ----------
const DX_SNAP: Record<string, string> = { // fixture id → production id (D13)
  [IDS.C63AC]: 'card_ace250c9c25342e4', [IDS.C58F8]: 'card_9ac2116a050840df', [IDS.C1DFC]: 'card_e10fb4fe39a9467f', [IDS.CF83F]: 'card_691a65ff98944697',
  [IDS.C481F]: 'card_482b4aa0bdd64c02', [IDS.C9ED9]: 'card_8f2c1a5e58294d27', [IDS.C4605]: 'card_05823a57e8224605',
};
const fromSnap = (id: string) => { const s = snapshotCard(IDS.DX, DX_SNAP[id] ?? id); return { spec_json: JSON.stringify(s.spec), queued_grant: s.queuedGrant ? JSON.stringify(s.queuedGrant) : null, context_id: s.contextId }; };

const D58F8 = 'Blocked on the forgeDestinationHold: operator must provide the authoritative writable Forge repository URL for SuperJackfruitLabs/agentpod and grant Tester Tim\'s station write access. The matching URL ssh://git@forge.superjackfruit.com:2222/SuperJackfruitLabs/agentpod.git authenticates as tester-tim and is readable, but push is refused with “Mirror Repository SuperJackfruitLabs/agentpod is read-only”. Local red-test commit 7a444f3a and verbatim failure evidence are preserved at https://app.superlibrary.dev/a/itm_569034f61d1b4b1a; no GitHub push was attempted.';
const D1DFC = 'this stage was not finished twice — first: the handoff is missing commit; then, after one automatic rework: the handoff is missing commit';
const D4605 = 'not reproduced end-to-end: Melissa’s live ACP session acps_8f86d4e4-1cf2-457b-beb8-0ffb529d9023 reached Hermes and produced a model reply, while Anna has no local ACP dispatch; first failing hop cannot be identified without one fresh DM event_id/room_id/timestamp per agent plus AgentPod hub matrix-inbound/control-pair/ACP/matrix-outbound logs, matrix_rooms/ACP metadata, homeserver send-event metadata, and Supermessage sync ingestion for those event IDs. No Accounts defect established; no issue filed.';

/** 4605's brief, as SP-Phone-Card-* print it (mockup-corrections card-page literal blocks). */
const SPEC_4605 = {
  description: 'Reproduce and localize why the existing AgentPod bridge Matrix identities for Message Melissa and Audience Anna do not respond to Ira in Supermessage. Produce an evidence-backed diagnosis and exact repair proposal; do not attribute silence to missing grants without live evidence.',
  acceptanceCriteria: [
    'Trace user DM ingress, room routing/bridge identity, control-pair authorization, station dispatch, ACP transport/model request and reply delivery; identify the first failing hop for each agent.',
    'Check real current shared-profile servicing rather than stale local gateway_state.json; these profiles are not separately startable.',
    'Check credential availability by presence only; never print .env, tokens or secret files. Profiles were cloned without messaging tokens intentionally because identities are bridge-owned.',
    'Read current AgentPod, Hermes and Accounts contracts/code; do not use retired Fleet grant endpoints or guess API behavior.',
    'Report separately what was reproduced, what cannot be accessed and the exact bounded repair needed; link evidence and preserve tenant/principal boundaries.',
  ],
  fieldLabels: { messageMelissa: 'Message Melissa', audienceAnna: 'Audience Anna' },
  groups: [
    { label: 'What to do', keys: ['rework', 'requiredEvidence'] },
    { label: 'Who it is about', keys: ['messageMelissa', 'audienceAnna'] },
    { label: 'Background', keys: ['context', 'latestConfirmedGrant'] },
    { label: 'Rules', keys: ['scope', 'accountsIssues'] },
    { label: 'Where work goes', keys: ['repository', 'routingRule'] },
  ],
  rework: 'Previous run ended with interim prose while child traces were pending; board rejected completion because repro and observed were missing. Do not spawn background delegate_task children on this rework: finish the bounded diagnosis in this card session.\n\nHand off repro and observed even when the hop cannot be named; say which evidence is missing.',
  messageMelissa: { matrixId: '@agent_message-melissa:id.agentpod.dev', card: IDS.CMEL, board: IDS.AO },
  audienceAnna: { matrixId: '@agent_audience-anna:id.agentpod.dev', card: IDS.CANNA, board: IDS.AO },
  context: 'Ira states his own mayDispatch grant already includes both agents and has now added them to Super Chotu\'s grant. The coordinator station JWT observed immediately after this still contained the original 30-principal list; distinguish token propagation from configured grants.\n\nA token minted before the grant change keeps the old list until it is renewed.',
  latestConfirmedGrant: 'Super Chotu fresh station JWT now contains both Melissa and Anna principals in mayDispatch (32 total). Token propagation is confirmed; do not continue treating the grant as missing.',
  scope: 'Diagnosis and repair proposal only. No gate decisions, credentials, principal links, grants, board policy, membership, service lifecycle changes or bypasses. No public posts or third-party messages.\n\nAsk on this card before touching anything outside the diagnosis.',
  accountsIssues: 'If the investigation identifies an Accounts implementation defect, raise a GitHub issue in SuperJackfruitLabs/accounts. No confirmed Accounts defect means no speculative issue.\n\nLink the issue from this card when you file one.',
  repository: { repo: 'SuperJackfruitLabs/atelier', visibility: 'private', policyUrl: 'https://github.com/SuperJackfruitLabs/atelier/blob/main/AGENTS.md' },
  routingRule: 'Internal artifacts and all Guild work default to Atelier. Verify destination visibility and classification before any push, PR, issue, comment or attachment; never use public fallback.\n\nWhen in doubt about a destination, block and ask.',
};
(SPEC_4605 as Record<string, unknown>).requiredEvidence = SPEC_4605.acceptanceCriteria;

function developerExperience(): FixtureBoard {
  const b = empty();
  const LBL = ['lbl_0259a14014754f69', 'lbl_e9ccaacaa2f94509', 'lbl_8430ce51795447c3'];
  b.cards = [
    card({ id: IDS.C63AC, queued_grant_owner: U, title: 'Fix the highest-severity blocker found in the clean-room journey', current_stage_key: 'reported', state: 'submitted', priority: 1, due_at: '2026-10-06', labels: JSON.stringify([...LBL, 'lbl_c5ee8f164fb54eb0']), project_id: 'prj_23b93f2d16d54b27', queued_by: CHOTU_PRN, queued_by_agent_id: CHOTU, created_at: '2026-10-04T10:19:08.402Z', state_since: '2026-10-08T09:51:01.514Z', overdue_notified_at: '2026-10-07T00:05:00Z', stale_notified_at: '2026-10-10T09:55:20Z', ...fromSnap(IDS.C63AC) }),
    card({ id: IDS.C58F8, queued_grant_owner: U, title: 'AgentPod: connector interface and generic effects ledger, state machine and executor', current_stage_key: 'test', state: 'input-required', priority: 2, project_id: 'prj_34b48f840daa4309', queued_by: CHOTU_PRN, queued_by_agent_id: CHOTU, created_at: '2026-10-08T10:31:33.618Z', updated_at: '2026-10-09T23:04:19.777Z', state_since: '2026-10-09T22:24:49.862Z', failure_count: 1, claim_seq: 1, needs_human_json: JSON.stringify({ reason: 'blocked', detail: D58F8, summary: 'Needs a writable Forge URL for agentpod.' }), stale_notified_at: '2026-10-10T22:25:12Z', ...fromSnap(IDS.C58F8) }),
    card({ id: IDS.C1DFC, title: 'Superpipeline: manual-delivery completion and approval-subject hardening', current_stage_key: 'fix', state: 'input-required', priority: 0, created_at: '2026-10-08T17:50:41.154Z', updated_at: '2026-10-09T23:04:59.675Z', state_since: '2026-10-09T22:45:45.522Z', failure_count: 2, claim_seq: 5, needs_human_json: JSON.stringify({ reason: 'blocked', detail: D1DFC, failureCount: 2, summary: 'Missing commit ×2.' }), stale_notified_at: '2026-10-10T22:50:12Z', ...fromSnap(IDS.C1DFC) }),
    card({ id: IDS.CF83F, queued_grant_owner: U, title: 'Integrate editorial workflows and prove no-write publishing acceptance', current_stage_key: 'test', state: 'submitted', priority: 2, project_id: 'prj_34b48f840daa4309', queued_by: CHOTU_PRN, queued_by_agent_id: CHOTU, created_at: '2026-10-08T10:31:34.691Z', state_since: '2026-10-08T17:50:23.062Z', ...fromSnap(IDS.CF83F) }),
    card({ id: IDS.C481F, title: 'agentpod-connectors: X connector (connector x)', current_stage_key: 'test', state: 'submitted', priority: 0, created_at: '2026-10-09T23:04:35.741Z', state_since: '2026-10-09T23:04:43.288Z', ...fromSnap(IDS.C481F) }),
    card({ id: IDS.C9ED9, title: 'Build immutable approval subjects and digest-bound gates', current_stage_key: 'shipped', state: 'completed', priority: 2, project_id: 'prj_34b48f840daa4309', created_at: '2026-10-08T10:31:32.526Z', state_since: '2026-10-09T22:19:24.419Z', claim_seq: 15, ...fromSnap(IDS.C9ED9) }),
    card({ id: IDS.C4605, queued_grant_owner: U, title: 'Diagnose Melissa and Anna Supermessage silence — trace actual failing hop', current_stage_key: 'reproduce', state: 'input-required', priority: 3, project_id: 'prj_42ab5ec961104f65', queued_by: CHOTU_PRN, queued_by_agent_id: CHOTU, created_at: '2026-10-08T17:55:00.000Z', updated_at: '2026-10-08T14:11:45.119Z', state_since: '2026-10-08T14:11:45.119Z', claim_seq: 2, needs_human_json: JSON.stringify({ reason: 'blocked', detail: D4605, summary: 'No fresh DM event to trace; needs one per agent.' }), stale_notified_at: '2026-10-10T14:11:50Z', ...fromSnap(IDS.C4605), spec_json: JSON.stringify(SPEC_4605) }),
    card({ id: 'card_47630a307f58426f', title: 'Scratch: forge push identity check (integration-ian)', current_stage_key: 'integrate', state: 'input-required', archived_at: '2026-10-09T14:21:02.650Z', created_at: '2026-10-09T14:18:14.596Z', updated_at: '2026-10-09T14:21:04.165Z', state_since: '2026-10-09T14:20:11.010Z', claim_seq: 1 }),
    card({ id: 'card_54ec7bee6c7e4828', title: 'Scratch: forge push identity check (error-eric)', current_stage_key: 'reproduce', state: 'input-required', archived_at: '2026-10-09T14:21:04.552Z', created_at: '2026-10-09T14:18:17.617Z', updated_at: '2026-10-09T14:21:05.989Z', state_since: '2026-10-09T14:20:06.788Z', claim_seq: 1 }),
  ];
  const tim = agentId('tester-tim'), kai = agentId('coder-kai'), ian = agentId('integration-ian'), alan = agentId('api-alan'), eric = agentId('error-eric');
  b.runs = [
    run({ id: 'run_fx_58f8_1', card_id: IDS.C58F8, stage_key: 'test', agent_id: tim, started_at: '2026-10-09T21:30:00Z', ended_at: '2026-10-09T22:24:49Z', outcome: 'blocked', n: 1, queued_by: CHOTU_PRN }),
    run({ id: 'run_fx_1dfc_1', card_id: IDS.C1DFC, stage_key: 'test', agent_id: tim, started_at: '2026-10-08T18:00:00Z', ended_at: '2026-10-08T19:10:00Z', outcome: 'completed', n: 1, handoff_json: JSON.stringify({ test: 'apps/api/test/manual-delivery-reminder.test.ts', fails: '1 failed' }) }),
    run({ id: 'run_fx_1dfc_2', card_id: IDS.C1DFC, stage_key: 'fix', agent_id: kai, started_at: '2026-10-09T08:00:00Z', ended_at: '2026-10-09T09:30:00Z', outcome: 'completed', n: 2, handoff_json: JSON.stringify({ summary: 'fix(api): schedule manual delivery reminders', commit: '7f540d29' }) }),
    run({ id: 'run_fx_1dfc_3', card_id: IDS.C1DFC, stage_key: 'integrate', agent_id: ian, started_at: '2026-10-09T12:00:00Z', ended_at: '2026-10-09T13:00:00Z', outcome: 'completed', n: 3, handoff_json: JSON.stringify({ verdict: 'unsafe', suite: 'REST path fails HTTP 400' }) }),
    run({ id: 'run_fx_1dfc_4', card_id: IDS.C1DFC, stage_key: 'fix', agent_id: kai, started_at: '2026-10-09T20:30:00Z', ended_at: '2026-10-09T21:30:00Z', outcome: 'completed', n: 4, completion: '{"ok":false,"missing":["commit"]}' }),
    run({ id: 'run_fx_1dfc_5', card_id: IDS.C1DFC, stage_key: 'fix', agent_id: kai, started_at: '2026-10-09T21:35:00Z', ended_at: '2026-10-09T22:45:45Z', outcome: 'blocked', n: 5, completion: '{"ok":false,"missing":["commit"]}' }),
    ...Array.from({ length: 14 }, (_, i) => {
      const n = i + 1, start = addMin('2026-10-08T11:00:00Z', i * 120);
      const [stage, who] = [['test', tim], ['fix', kai], ['integrate', n % 2 ? ian : alan]][i % 3]!;
      return run({ id: `run_fx_9ed9_${n}`, card_id: IDS.C9ED9, stage_key: stage, agent_id: who, started_at: start, ended_at: addMin(start, 90), outcome: 'completed', n });
    }),
    run({ id: 'run_fx_9ed9_15', card_id: IDS.C9ED9, stage_key: 'fix', agent_id: kai, started_at: '2026-10-09T20:00:00Z', ended_at: '2026-10-09T21:40:00Z', outcome: 'completed', n: 15, handoff_json: JSON.stringify({ summary: 'fix(approval): make delivery switches atomic', commit: 'ba417fd0' }) }),
    run({ id: 'run_fx_4605_1', card_id: IDS.C4605, stage_key: 'reproduce', agent_id: eric, started_at: '2026-10-08T06:05:10Z', ended_at: '2026-10-08T06:41:00Z', outcome: 'completed', n: 1, completion: '{"ok":false,"missing":["repro","observed"]}', failure_reason: 'repro and observed missing', queued_by: CHOTU_PRN }),
    run({ id: 'run_fx_4605_2', card_id: IDS.C4605, stage_key: 'reproduce', agent_id: eric, started_at: '2026-10-08T13:20:00Z', ended_at: '2026-10-08T14:11:43Z', outcome: 'blocked', n: 2, queued_by: CHOTU_PRN }),
    run({ id: 'run_fx_6281_1', card_id: 'card_47630a307f58426f', stage_key: 'integrate', agent_id: ian, started_at: '2026-10-09T14:18:30Z', ended_at: '2026-10-09T14:20:10Z', outcome: 'blocked', n: 1 }),
    run({ id: 'run_fx_4828_1', card_id: 'card_54ec7bee6c7e4828', stage_key: 'reproduce', agent_id: eric, started_at: '2026-10-09T14:18:30Z', ended_at: '2026-10-09T14:20:10Z', outcome: 'blocked', n: 1 }),
  ];
  b.activities = [
    act('run_fx_4605_1', IDS.C4605, 'response', '2026-10-08T06:41:00Z', 'The board refused completion: repro and observed were missing.', 'Sent back'),
    ...tools('run_fx_4605_1', IDS.C4605, '2026-10-08T06:06:00Z', 4, 8),
    act('run_fx_4605_2', IDS.C4605, 'thought', '2026-10-08T13:20:05Z', 'Rework run on this card session; read prior persisted evidence first.', 'Started'),
    ...tools('run_fx_4605_2', IDS.C4605, '2026-10-08T13:22:00Z', 4, 12),
    act('run_fx_4605_2', IDS.C4605, 'response', '2026-10-08T14:11:43Z', 'Blocked. Waiting on you; the reason is shown at the top of this card.', null, { kind: 'MESSAGE', signal: 'stop' }),
    act('run_fx_58f8_1', IDS.C58F8, 'response', '2026-10-09T22:24:49Z', D58F8),
    ...tools('run_fx_58f8_1', IDS.C58F8, '2026-10-09T21:31:00Z', 5, 6),
    ...[1, 2, 3, 4, 5].map((n) => act(`run_fx_1dfc_${n}`, IDS.C1DFC, 'response', b.runs.find((r) => r.id === `run_fx_1dfc_${n}`)!.ended_at as string, n === 5 ? D1DFC : 'Handed on.')),
  ];
  b.references = Object.keys(DX_SNAP).flatMap((id) => snapshotRefs(IDS.DX, DX_SNAP[id]!, id));
  b.links = [
    { from_card_id: IDS.C481F, to_card_id: IDS.CF83F, kind: 'blocks', created_at: '2026-10-09T23:04:42Z', created_by: U },
    { from_card_id: IDS.C58F8, to_card_id: IDS.CF83F, kind: 'blocks', created_at: '2026-10-08T17:50:20Z', created_by: CHOTU },
    { from_card_id: IDS.C1DFC, to_card_id: IDS.CF83F, kind: 'blocks', created_at: '2026-10-08T17:50:41Z', created_by: U },
    { from_card_id: IDS.C58F8, to_card_id: IDS.C481F, kind: 'blocks', created_at: '2026-10-09T23:04:44Z', created_by: U },
  ];
  b.gates = [{ id: 'gate_fx_9ed9', card_id: IDS.C9ED9, stage_key: 'signed-off', return_stage_key: 'integrate', status: 'resolved', decision: 'approve', comment: null, produced_by: kai, decided_by: U, decided_via: 'web', options_json: JSON.stringify(DEFAULT_GATE_OPTIONS), created_at: '2026-10-09T21:41:00Z', resolved_at: '2026-10-09T22:19:24Z', run_id: 'run_fx_9ed9_15', approval_subject_id: null, approval_subject_digest: null, approval_decider_ids_json: null }];
  const stale1dfc = `Stuck 24h in Fix: ${D1DFC}. Next: resume it`;
  const stale58f8 = `Stuck 24h in Failing test: ${D58F8} Next: resume it`;
  const stale4605 = `Stuck 24h in Reproduce: ${D4605} Next: resume it`;
  const noOwner = (h: number) => `Stuck ${h}h in Reported: No agent works this stage and no review is asked for here. Next: move it to a stage someone works`;
  const n = (card_id: string, kind: string, body: string, created_at: string) => ({ kind, card_id, user_id: U, body, read: 0 as const, created_at });
  b.notifications = [
    n(IDS.C1DFC, 'stale', stale1dfc, '2026-10-10T22:50:12Z'), n(IDS.C1DFC, 'blocked', D1DFC, '2026-10-09T22:45:45Z'),
    n(IDS.C1DFC, 'rework', 'Sent back for one automatic rework: the handoff is missing commit', '2026-10-09T21:30:01Z'),
    n(IDS.C1DFC, 'rework', 'Sent back to "fix" from "integrate": REST path fails HTTP 400', '2026-10-09T13:00:01Z'), n(IDS.C1DFC, 'stale', stale1dfc, '2026-10-10T10:50:12Z'),
    n(IDS.C58F8, 'stale', stale58f8, '2026-10-10T22:25:12Z'), n(IDS.C58F8, 'blocked', D58F8, '2026-10-09T22:24:50Z'), n(IDS.C58F8, 'stale', stale58f8, '2026-10-10T10:25:12Z'),
    n(IDS.C58F8, 'control-pair', 'Not dispatched: waiting for a grant that covers tester-tim', '2026-10-08T10:31:40Z'), n(IDS.C58F8, 'blocked', 'Waiting on the Forge destination', '2026-10-09T21:31:00Z'),
    n(IDS.C63AC, 'stale', noOwner(48), '2026-10-10T09:55:20Z'), n(IDS.C63AC, 'stale', noOwner(24), '2026-10-09T09:55:20Z'),
    n(IDS.C63AC, 'overdue', '"Fix the highest-severity blocker found in the clean-room journey" was due 2026-10-06', '2026-10-07T00:05:00Z'),
    n(IDS.C63AC, 'stale', noOwner(12), '2026-10-08T21:55:20Z'), n(IDS.C63AC, 'control-pair', 'Not dispatched: no agent works Reported', '2026-10-04T10:19:10Z'),
    n(IDS.C63AC, 'blocked', 'Waiting on a person in Reported', '2026-10-08T09:51:02Z'),
    n(IDS.C4605, 'blocked', D4605, '2026-10-08T14:11:46Z'), n(IDS.C4605, 'stale', stale4605, '2026-10-10T02:11:50Z'), n(IDS.C4605, 'stale', stale4605, '2026-10-10T14:11:50Z'),
  ];
  const ev = (ts: string, type: string, payload: unknown) => ({ ts, type, payload });
  b.events = [
    ev('2026-10-10T22:50:12Z', 'cards.stale_digest', { cardIds: [IDS.C1DFC] }), ev('2026-10-10T22:50:12Z', 'notification', { cardId: IDS.C1DFC, kind: 'stale', body: stale1dfc }),
    ev('2026-10-10T22:25:12Z', 'cards.stale_digest', { cardIds: [IDS.C58F8] }), ev('2026-10-10T22:25:12Z', 'notification', { cardId: IDS.C58F8, kind: 'stale', body: stale58f8 }),
    ev('2026-10-10T14:11:50Z', 'cards.stale_digest', { cardIds: [IDS.C4605] }), ev('2026-10-10T14:11:50Z', 'notification', { cardId: IDS.C4605, kind: 'stale', body: stale4605 }),
    ev('2026-10-10T09:55:20Z', 'cards.stale_digest', { cardIds: [IDS.C63AC] }), ev('2026-10-10T09:55:20Z', 'notification', { cardId: IDS.C63AC, kind: 'stale', body: noOwner(48) }),
    ev('2026-10-09T23:05:00Z', 'link.added', { from: IDS.C58F8, to: IDS.C481F, kind: 'blocks' }), ev('2026-10-09T23:04:59Z', 'card.updated', { cardId: IDS.C1DFC }),
    ev('2026-10-09T23:04:44Z', 'link.added', { from: IDS.C58F8, to: IDS.C481F, kind: 'blocks' }), ev('2026-10-09T23:04:43Z', 'notification', { cardId: IDS.C481F, kind: 'blocked', body: 'Waiting on a person in Failing test' }),
    ev('2026-10-09T23:04:43Z', 'card.moved', { cardId: IDS.C481F, to: 'test', from: 'reported' }), ev('2026-10-09T23:04:42Z', 'link.added', { from: IDS.C481F, to: IDS.CF83F, kind: 'blocks' }),
    ev('2026-10-09T23:04:35Z', 'card.created', { cardId: IDS.C481F }),
    ...Array.from({ length: 45 }, (_, i) => ev(addMin('2026-10-09T22:55:00Z', -10 * i), 'card.updated', { cardId: [IDS.C63AC, IDS.C58F8, IDS.C1DFC, IDS.CF83F, IDS.C481F, IDS.C9ED9][i % 6] })),
  ];
  b.meta = { staleEnabled: '1', staleAfterHours: '24' };
  return b;
}

const DEFAULT_GATE_OPTIONS = [{ name: 'approve', title: 'Approve', description: 'File the recommendation as it is.' }, { name: 'request_changes', title: 'Request changes', interactive: true }, { name: 'reject', title: 'Reject' }];

// ---------- Agent Onboarding (§A.6.1; WC-5: Melissa done Thursday) ----------
function agentOnboarding(): FixtureBoard {
  const b = empty();
  const olivia = agentId('onboarding-olivia');
  const snap = snapshot(IDS.AO);
  const title = (id: string) => snap.cards.find((c) => c.id === id)!.title;
  const rows: Array<[id: string, prio: number, attempts: number, since: string, extra?: Partial<Row>]> = [
    ['card_9d48db2717044b69', 1, 10, '2026-10-10T12:21:00Z', { labels: JSON.stringify(['lbl_0259a14014754f69', 'lbl_e9ccaacaa2f94509', 'lbl_8430ce51795447c3', 'lbl_8f31b566952f4d0f']), due_at: '2026-10-05', project_id: 'prj_23b93f2d16d54b27' }],
    [IDS.CMEL, 2, 5, '2026-10-08T13:56:34.688Z', { queued_by: CHOTU_PRN, queued_by_agent_id: CHOTU, project_id: 'prj_42ab5ec961104f65', handoff_json: JSON.stringify({ summary: 'Melissa is resident. Her identity, router description and portrait are in place, and you credentialed her at the resident gate.', handedOn: 'Profile, router description, safe profile and portrait drafted through this pipeline. No posting, DMs or scheduling without separate operator authorisation.' }) }],
    [IDS.CANNA, 2, 5, '2026-10-08T13:56:33.362Z', { queued_by: CHOTU_PRN, queued_by_agent_id: CHOTU, project_id: 'prj_42ab5ec961104f65' }],
    ['card_94266a0d5c984dc8', 0, 5, '2026-10-01T22:30:00Z'], ['card_09a6d0a769af4f53', 0, 8, '2026-10-01T22:20:56.146Z'],
    ...([['card_21deed82a8234207', 6], ['card_8c0cc34928b64039', 4], ['card_aac5209ffeeb46fa', 4], ['card_a9142e1c13a34b25', 4], ['card_9e822d4ab738445a', 5],
      ['card_ca729f68efbe4c60', 4], ['card_d696357097e14610', 4], ['card_406c647efb0b402b', 4], ['card_d38581137b804231', 4], ['card_eb98af68aee342f0', 4],
      ['card_1675bc0fefb74306', 4], ['card_5cff9e9d471241af', 4], ['card_a1907a8e2c2c462c', 4], ['card_78c7bb41247645da', 6], ['card_0243d9a932e54363', 7]] as const)
      .map(([id, n], i) => [id, 0, n, addMin('2026-10-01T21:00:00Z', -10 * (i + 1))] as [string, number, number, string]),
  ];
  for (const [id, priority, attempts, since, extra] of rows) {
    const s = snapshotCard(IDS.AO, id);
    b.cards.push(card({ id, title: title(id), current_stage_key: 'resident', state: 'completed', priority, created_at: s.createdAt, state_since: since, claim_seq: attempts, spec_json: JSON.stringify(s.spec), context_id: s.contextId, queued_grant: s.queuedGrant ? JSON.stringify(s.queuedGrant) : null, ...extra }));
    for (let n = 1; n <= attempts; n++) {
      const ended = n === attempts ? since : addMin(since, -60 * (attempts - n + 1));
      b.runs.push(run({ id: `run_fx_${id.slice(5, 13)}_${n}`, card_id: id, stage_key: n === attempts ? 'resident' : 'drafted', agent_id: olivia, started_at: addMin(ended, -30), ended_at: ended, outcome: 'completed', n,
        handoff_json: n === attempts && id === IDS.CMEL ? (extra!.handoff_json as string) : null }));
    }
  }
  b.cards.push(card({ id: 'card_e3c7940daca24158', title: title('card_e3c7940daca24158'), current_stage_key: 'requested', state: 'submitted', priority: 3, created_at: snapshotCard(IDS.AO, 'card_e3c7940daca24158').createdAt, state_since: '2026-10-08T14:11:41.633Z', archived_at: '2026-10-08T14:11:41.633Z' }));
  b.links = [{ from_card_id: 'card_e3c7940daca24158', to_card_id: IDS.CMEL, kind: 'blocks', created_at: '2026-10-08T14:11:00Z', created_by: U }, { from_card_id: 'card_e3c7940daca24158', to_card_id: IDS.CANNA, kind: 'blocks', created_at: '2026-10-08T14:11:00Z', created_by: U }];
  b.references = [
    { id: 'ref_fx_cleanroom6', card_id: 'card_9d48db2717044b69', url: 'https://app.superlibrary.dev/a/itm_fx_cleanroom6', title: 'Clean-room SuperPipeline operator journey — attempt 6 evidence', subtitle: null, provider: 'superlibrary', source_type: 'artifact', external_id: 'itm_fx_cleanroom6', metadata_json: null, sync_state: 'synced', last_synced_at: null, added_by: 'agent', created_at: '2026-10-10T12:00:00Z', updated_at: null, run_id: null },
    ...snapshotRefs(IDS.AO, IDS.CMEL, IDS.CMEL), ...snapshotRefs(IDS.AO, IDS.CANNA, IDS.CANNA),
  ];
  return b;
}

// ---------- Research & Intelligence (WC-3: live at its approval gate) ----------
const SUBJECT = { kind: 'Recommendation, one paragraph', synthesis: 'The organization plane exists so that one issuer, Accounts, says who a person or an agent is in every product. Before it, each product kept its own users and tokens, so a grant made in one place meant nothing in the next. With one issuer, a workspace, its members and its agents are defined once, and every product checks the same token.', sources: ['Organization plane cutover record, 7 Oct'] };
const DIGEST = 'sha256:9f3ac2e1d07109285773f2418680752df16dbb42e26181bf657d331db98fcb84';
function researchIntelligence(): FixtureBoard {
  const b = empty();
  const ray = agentId('research-ray'), paul = agentId('predictor-paul');
  const snap = snapshot(IDS.RI);
  for (const c of snap.cards) {
    const live = c.id === IDS.CRI;
    b.cards.push(card({ id: c.id, title: live ? 'P4 exit test: one-paragraph synthesis of ‘why the organization plane exists’ (gate test — approve from Matrix)' : c.title,
      current_stage_key: live ? 'recommendation' : 'filed', state: live ? 'input-required' : 'completed', created_at: c.createdAt,
      state_since: live ? '2026-10-11T07:18:00Z' : c.createdAt, updated_at: live ? '2026-10-11T07:18:00Z' : c.createdAt, archived_at: live ? null : '2026-10-05T06:00:00Z',
      spec_json: JSON.stringify(c.spec), context_id: c.contextId, claim_seq: live ? 4 : 0, active_approval_subject_id: live ? 'aps_fx_p4' : null,
      handoff_json: live ? JSON.stringify({ summary: 'All done, ready for your review.' }) : null }));
  }
  const steps: Array<[string, string, string, string]> = [['run_fx_p4_1', 'gather', ray, '2026-10-11T05:30:00Z'], ['run_fx_p4_2', 'measure', paul, '2026-10-11T06:10:00Z'], ['run_fx_p4_3', 'synthesise', ray, '2026-10-11T06:40:00Z'], ['run_fx_p4_4', 'synthesise', ray, '2026-10-11T07:18:00Z']];
  steps.forEach(([id, stage, who, ended], i) => b.runs.push(run({ id, card_id: IDS.CRI, stage_key: stage, agent_id: who, started_at: addMin(ended, -25), ended_at: ended, outcome: 'completed', n: i + 1 })));
  b.activities = [act('run_fx_p4_4', IDS.CRI, 'response', '2026-10-11T07:18:00Z', 'All done, ready for your review.')];
  b.approvalSubjects = [{ id: 'aps_fx_p4', card_id: IDS.CRI, gate_stage_key: 'recommendation', schema: 'recommendation/v1', revision: 2, canonical_bytes_b64: Buffer.from(JSON.stringify(SUBJECT), 'utf8').toString('base64'), digest: DIGEST, status: 'active', producer_run_id: 'run_fx_p4_4', produced_by: ray, created_at: '2026-10-11T07:18:00Z', invalidated_at: null, invalidated_by: null, invalidation_reason: null }];
  b.gates = [{ id: 'gate_fx_p4', card_id: IDS.CRI, stage_key: 'recommendation', return_stage_key: 'synthesise', status: 'pending', decision: null, comment: null, produced_by: ray, decided_by: null, options_json: JSON.stringify([{ name: 'approve', title: 'Approve', description: 'File the recommendation as it is.' }, { name: 'request_changes', title: 'Request changes', interactive: true }, { name: 'reject', title: 'Reject' }]), created_at: '2026-10-11T07:18:00Z', resolved_at: null, run_id: 'run_fx_p4_4', approval_subject_id: 'aps_fx_p4', approval_subject_digest: DIGEST, approval_decider_ids_json: JSON.stringify([U]) }];
  b.references = snap.references.length ? snapshotRefs(IDS.RI, IDS.CRI, IDS.CRI) : [];
  return b;
}

// ---------- Marketing & Community (card C, archived 9 Oct with its review cancelled) ----------
function marketingCommunity(): FixtureBoard {
  const b = empty();
  const snap = snapshot(IDS.MC);
  for (const c of snap.cards) {
    const isC = c.id === IDS.CARCH;
    b.cards.push(card({ id: c.id, title: c.title, current_stage_key: isC ? 'messaging-review' : 'requested', state: 'submitted', created_at: c.createdAt, state_since: c.createdAt,
      archived_at: isC ? '2026-10-09T05:30:00Z' : '2026-10-05T06:00:00Z', context_id: c.contextId,
      spec_json: JSON.stringify(isC ? { ...(c.spec as object), description: 'Verify Super Chotu can dispatch Message Melissa. Produce a DRAFT three-sentence messaging brief for workspace operators about registering an agent.' } : c.spec) }));
  }
  b.runs = [run({ id: 'run_fx_mc_1', card_id: IDS.CARCH, stage_key: 'messaging', agent_id: agentId('message-melissa'), started_at: '2026-10-08T13:30:00Z', ended_at: '2026-10-08T14:00:30Z', outcome: 'completed', n: 1 })];
  b.gates = [{ id: 'gate_fx_mc', card_id: IDS.CARCH, stage_key: 'messaging-review', return_stage_key: 'messaging', status: 'cancelled', decision: null, comment: 'Its pending review was cancelled when the card was archived.', produced_by: agentId('message-melissa'), decided_by: null, decided_via: null, options_json: JSON.stringify(DEFAULT_GATE_OPTIONS), created_at: '2026-10-08T14:00:31Z', resolved_at: '2026-10-09T05:30:00Z', run_id: 'run_fx_mc_1', approval_subject_id: null, approval_subject_digest: null, approval_decider_ids_json: null }];
  b.references = snap.references.filter((r) => r.cardId === IDS.CARCH).length ? snapshotRefs(IDS.MC, IDS.CARCH, IDS.CARCH) : [];
  return b;
}

// ---------- Remaining boards (§A.6.5; WC-4 Guild Ops card 1 asks a question) ----------
function synthesized(boardId: string, name: string, live: number, kinds: Array<'needs' | 'question' | 'submitted' | 'completed'>, stages: string[]): FixtureBoard {
  const b = empty();
  const short = boardId.slice(4, 8);
  kinds.slice(0, live).forEach((kind, i) => {
    const id = `card_fx_${short}_${String(i + 1).padStart(4, '0')}`;
    const at = addMin('2026-10-05T04:00:00Z', 60 * (i + 1));
    // A queued card waits in the first stage an agent works: a human stage would make it an
    // ownerless, stale item and change the Switcher's "need you" counts (§A.4.1).
    const worked = (snapshot(boardId).stages.find((x) => x.ownerKind !== 'human')?.key as string | undefined) ?? stages[0]!;
    const stage = kind === 'completed' ? stages.at(-1)! : kind === 'submitted' ? worked : kind === 'question' ? 'build' : kind === 'needs' ? 'audit' : worked;
    const since = boardId === IDS.CQ && kind === 'needs' ? '2026-10-11T03:30:00Z' : boardId === IDS.GUILD && kind === 'question' ? '2026-10-11T02:10:00Z' : at;
    b.cards.push(card({ id, title: `${name} fixture card ${i + 1}`, current_stage_key: stage, state: kind === 'completed' ? 'completed' : kind === 'submitted' ? 'submitted' : 'input-required', created_at: at, state_since: since,
      needs_human_json: kind === 'needs' ? JSON.stringify({ reason: 'blocked', detail: 'Waiting on a person' }) : null, current_run_id: kind === 'question' ? `run_fx_${short}_1` : null, claim_seq: kind === 'needs' || kind === 'question' ? 1 : 0 }));
    if (kind === 'needs') b.runs.push(run({ id: `run_fx_${short}_1`, card_id: id, stage_key: stage, agent_id: agentId('threat-hunter-theo'), started_at: addMin(since, -40), ended_at: since, outcome: 'blocked', n: 1 }));
    if (kind === 'question') {
      b.runs.push(run({ id: `run_fx_${short}_1`, card_id: id, stage_key: stage, agent_id: agentId('optimizer-ollie'), started_at: addMin(since, -20), ended_at: null, outcome: null, n: 1, status: 'active' }));
      b.elicitations.push({ id: 'elc_fx_guild1', card_id: id, run_id: `run_fx_${short}_1`, stage_key: stage, agent_id: agentId('optimizer-ollie'),
        question: 'The handoff needs a commit, and the fix is still on an unmerged branch. Should I hand on the branch commit, or wait until it is merged?',
        signal: null, options_json: '[]', status: 'pending', answer_option: null, answer_text: null, answered_by: null, created_at: since, answered_at: null });
    }
  });
  return b;
}
const stageKeys = (id: string) => snapshot(id).stages.map((s) => s.key as string);

const BOARD_ROWS: Array<[id: string, updatedAt: string]> = [
  [IDS.DX, '2026-10-11T08:20:00Z'], [IDS.RI, '2026-10-11T07:18:00Z'], ['brd_6c298ec02d6b466b', '2026-10-11T03:30:00Z'], [IDS.GUILD, '2026-10-11T02:10:00Z'],
  [IDS.AO, '2026-10-11T01:00:00Z'], ['brd_6a899b0f0d054046', '2026-10-10T06:00:00Z'], ['brd_24280cb0c7614d36', '2026-10-10T04:00:00Z'], ['brd_0435b5ea3d4d4e44', '2026-10-08T06:00:00Z'],
  [IDS.PR, '2026-10-07T06:00:00Z'], ['brd_c13e29c2e7e940fa', '2026-10-03T06:00:00Z'], [IDS.MC, '2026-10-02T06:00:00Z'], ['brd_511653e16d5e4689', '2026-09-19T06:00:00Z'],
];

/** Stages from the snapshot, with the §A.5.1 / §A.6 overrides. */
function stagesOf(id: string): unknown[] {
  if (id === IDS.DX) return [
    { key: 'reported', name: 'Reported', order: 0, ownerKind: 'human', instructions: 'Describe one problem a developer hit. What you did, what happened, what you expected.\n\nInclude the version, commit or environment — a bug report without one costs the reproduce stage its first hour.' },
    { key: 'reproduce', name: 'Reproduce', order: 1, ownerKind: 'capability', owner: 'diagnostics', instructions: 'Make the problem happen on purpose. Until it can be reproduced on demand, nothing after this stage can tell a fix from a coincidence.', completion: { handoff: ['repro', 'observed'] } },
    { key: 'test', name: 'Failing test', order: 2, ownerKind: 'capability', owner: 'testing', completion: { handoff: ['test', 'fails'] } },
    { key: 'fix', name: 'Fix', order: 3, ownerKind: 'capability', owner: 'code', completion: { handoff: ['summary', 'commit'], reference: { sourceType: 'commit' } } },
    { key: 'integrate', name: 'Integrate', order: 4, ownerKind: 'capability', owner: 'integration', requires: { any: ['integration', 'api', 'testing'] }, completion: { handoff: ['verdict', 'suite'] }, returnStage: 'fix' },
    { key: 'signed-off', name: 'Signed off', order: 5, ownerKind: 'human', gate: 'approval' },
    { key: 'shipped', name: 'Shipped', order: 6, ownerKind: 'human' },
  ];
  const s = snapshot(id).stages.map((x, i) => {
    const { instructions: _drop, ...rest } = x as Record<string, unknown>;
    return { ...rest, order: typeof rest.order === 'number' ? rest.order : i };
  });
  if (id === IDS.PR) {
    const summaries: Record<string, string> = {
      proposed: 'Someone writes up the release: what ships and why.',
      staged: 'Stages the release. Picks up cards that need the release skill.',
      checks: 'Runs the security review before anyone decides.',
      'go-no-go': 'An approval gate. One release at a time waits here for your yes or no.',
      released: 'A person marks it live. The card is done.',
    };
    return s.map((x) => ({ ...(x as Record<string, unknown>), summary: summaries[(x as { key: string }).key] }));
  }
  if (id === IDS.RI) return s.map((x) => ((x as { key: string }).key === 'recommendation' ? { ...x, approvalSubjectSchema: 'recommendation/v1' } : x));
  return s;
}

const dos: Record<string, FixtureBoard> = {
  [IDS.DX]: developerExperience(), [IDS.AO]: agentOnboarding(), [IDS.RI]: researchIntelligence(), [IDS.MC]: marketingCommunity(), [IDS.PR]: { ...empty(), meta: { intro: JSON.stringify({ lede: 'It takes a release from **proposal to production** in five stages. **devops-dave** stages it, **vulnerability-victor** checks it, and **you** give the go or no-go before it is released.', composeHint: 'Say what you want released in a sentence; an agent drafts the brief.' }) } },
  [IDS.CQ]: synthesized(IDS.CQ, 'Client Quality', 2, ['needs', 'submitted'], stageKeys(IDS.CQ)),
  [IDS.GUILD]: synthesized(IDS.GUILD, 'Guild Operations & Automation', 3, ['question', 'submitted', 'submitted'], stageKeys(IDS.GUILD)),
  brd_6a899b0f0d054046: synthesized('brd_6a899b0f0d054046', 'Editorial & Fact-Checking', 3, ['completed', 'completed', 'completed'], stageKeys('brd_6a899b0f0d054046')),
  brd_24280cb0c7614d36: synthesized('brd_24280cb0c7614d36', 'Recurring Maintenance', 4, ['completed', 'completed', 'completed', 'completed'], stageKeys('brd_24280cb0c7614d36')),
  brd_0435b5ea3d4d4e44: synthesized('brd_0435b5ea3d4d4e44', 'Planning & Roadmap', 3, ['completed', 'completed', 'completed'], stageKeys('brd_0435b5ea3d4d4e44')),
  brd_c13e29c2e7e940fa: empty(), brd_511653e16d5e4689: empty(),
};

const CAPS_DECLARED = ['analysis', 'claim-check', 'code', 'command', 'design', 'maintenance', 'onboarding', 'planning', 'research', 'resilience', 'security', 'writing'];
const CAPS_INFERRED = ['testing', 'diagnostics', 'integration', 'api', 'release', 'security-review', 'marketing'];

export const BASE_WORLD: World = {
  tenant: { id: 'tnt_vibes', slug: 'vibes-fixture', name: 'SuperJackfruit Labs', forgeHost: 'forge.superjackfruit.com', externalId: 'fleet_vibes', externalSource: 'agentpod', createdAt: '2026-09-01T00:00:00Z' },
  user: { id: U, email: 'ira@vibes-fixture.invalid', name: 'Ira Mehta', createdAt: '2026-09-01T00:00:00Z' },
  membership: { id: 'mbr_vibes_ira', role: 'owner', createdAt: '2026-09-01T00:00:00Z' },
  boards: BOARD_ROWS.map(([id, updatedAt]) => ({ id, name: snapshot(id).name, stages: stagesOf(id), createdAt: '2026-09-01T04:00:00Z', updatedAt, createdBy: U })),
  agents: AGENTS.map(([slug, caps, tokens, external], i) => ({
    id: agentId(slug), name: slug, capabilities: caps, externalId: external ?? `prn_fx_${slug.replace(/-/g, '_')}`, ownerUserId: U,
    mayQueueTo: slug === 'super-chotu' ? [IDS.DX, IDS.AO, IDS.MC, IDS.RI] : null, createdAt: addMin('2026-09-01T05:00:00Z', i + 1), tokens,
    role: slug === 'error-eric' ? 'Diagnostics' : null,
  })),
  capabilities: [...CAPS_DECLARED, ...CAPS_INFERRED].sort().map((key, i) => ({
    key, description: key === 'claim-check' ? 'Checks that what an agent says it did is what the record shows.' : null,
    origin: CAPS_INFERRED.includes(key) ? 'inferred' as const : 'declared' as const, createdAt: addMin('2026-09-01T04:30:00Z', i),
  })),
  implications: [{ from: 'claim-check', to: 'analysis', createdAt: '2026-09-01T04:45:00Z' }],
  labels: [
    { id: 'lbl_0259a14014754f69', name: 'clean-room', colour: 'var(--vk-mood-thinking)', origin: 'inferred', createdAt: '2026-10-04T10:19:08Z' },
    { id: 'lbl_e9ccaacaa2f94509', name: 'evidence-required', colour: 'var(--vk-mood-done)', origin: 'inferred', createdAt: '2026-10-04T10:19:09Z' },
    { id: 'lbl_8430ce51795447c3', name: 'superpipeline', colour: 'var(--vk-mood-working)', origin: 'inferred', createdAt: '2026-10-04T10:19:10Z' },
  ],
  projects: [
    { id: 'prj_34b48f840daa4309', name: 'Building in public — Marketing & Community flow', description: null, targetDate: null, state: 'active', health: null, leadUserId: U, createdAt: '2026-10-01T04:00:00Z' },
    { id: 'prj_23b93f2d16d54b27', name: 'Guild — Forge workspaces and checkpoint recovery', description: null, targetDate: null, state: 'active', health: null, leadUserId: U, createdAt: '2026-10-02T04:00:00Z' },
    { id: 'prj_42ab5ec961104f65', name: 'Marketing & Community — Melissa and Anna onboarding', description: null, targetDate: null, state: 'active', health: null, leadUserId: U, createdAt: '2026-10-08T06:00:00Z' },
    { id: 'prj_fx_sjl_portfolio', name: 'SJL Active Portfolio', description: null, targetDate: '2026-10-05', state: 'completed', health: 'on-track', leadUserId: U, createdAt: '2026-09-20T04:00:00Z' },
    { id: 'prj_fx_sjl_baseline', name: 'SJL Operating Baseline', description: null, targetDate: '2026-10-09', state: 'completed', health: 'on-track', leadUserId: U, createdAt: '2026-09-21T04:00:00Z' },
  ],
  milestones: [],
  externalLinks: [],
  dos,
};
