// apps/web/e2e/pixel/fixture/dialog-cases.ts — test inputs that mirror the fixture world (F §A.4.2, §A.5.1, §A.6.4, DLG D-3)
import type { AgentSummary, BoardSummary, Stage } from '../../../src/lib/api';

const agent = (id: string, name: string, capabilities: string[]): AgentSummary => ({
  id, name, capabilities, externalId: null, externalSource: null, iconUrl: null, concurrency: 1, tokenIds: [],
  role: null, claimedCount: 0, workingCount: 0,
});

/** The 22 fixture agents, in created_at order (the API order). */
export const AGENTS: AgentSummary[] = [
  agent('agt_fx_research_ray', 'research-ray', ['research']),
  agent('agt_fx_optimizer_ollie', 'optimizer-ollie', ['code']),
  agent('agt_fx_writer_quill', 'writer-quill', ['writing']),
  agent('agt_fx_strategy_sam', 'strategy-sam', ['planning']),
  agent('agt_fx_predictor_paul', 'predictor-paul', ['analysis']),
  agent('agt_fx_analyst_echo', 'analyst-echo', ['analysis', 'claim-check']),
  agent('agt_fx_cleaner_cody', 'cleaner-cody', ['maintenance']),
  agent('agt_fx_coder_kai', 'coder-kai', ['code']),
  agent('agt_fx_project_manager_pete', 'project-manager-pete', ['planning']),
  agent('agt_fx_controller_casey', 'controller-casey', ['planning']),
  agent('agt_bb586732b807460c', 'super-chotu', ['command']),
  agent('agt_fx_threat_hunter_theo', 'threat-hunter-theo', ['security']),
  agent('agt_fx_onboarding_olivia', 'onboarding-olivia', ['onboarding']),
  agent('agt_fx_artistic_lyra', 'artistic-lyra', ['design']),
  agent('agt_fx_chaos_charlie', 'chaos-charlie', ['resilience']),
  agent('agt_fx_tester_tim', 'tester-tim', ['testing']),
  agent('agt_fx_error_eric', 'error-eric', ['diagnostics']),
  agent('agt_fx_integration_ian', 'integration-ian', ['integration']),
  agent('agt_fx_api_alan', 'api-alan', ['api']),
  agent('agt_fx_devops_dave', 'devops-dave', ['release']),
  agent('agt_fx_vulnerability_victor', 'vulnerability-victor', ['security-review']),
  agent('agt_fx_message_melissa', 'message-melissa', ['marketing']),
];

export const DX_STAGES: Stage[] = [
  { key: 'reported', name: 'Reported', order: 0, ownerKind: 'human' },
  { key: 'reproduce', name: 'Reproduce', order: 1, ownerKind: 'capability', owner: 'diagnostics' },
  { key: 'test', name: 'Failing test', order: 2, ownerKind: 'capability', owner: 'testing' },
  { key: 'fix', name: 'Fix', order: 3, ownerKind: 'capability', owner: 'code' },
  { key: 'integrate', name: 'Integrate', order: 4, ownerKind: 'capability', owner: 'integration', requires: { any: ['integration', 'api', 'testing'] } },
  { key: 'signed-off', name: 'Signed off', order: 5, ownerKind: 'human', gate: 'approval' },
  { key: 'shipped', name: 'Shipped', order: 6, ownerKind: 'human' },
];

/** Production Releases (F §A.6.4): proposed human; staged = release; checks = security-review; go-no-go gate; released human. */
export const PR_STAGES: Stage[] = [
  { key: 'proposed', name: 'Proposed', order: 0, ownerKind: 'human' },
  { key: 'staged', name: 'Staged', order: 1, ownerKind: 'capability', owner: 'release' },
  { key: 'checks', name: 'Checks', order: 2, ownerKind: 'capability', owner: 'security-review' },
  { key: 'go-no-go', name: 'Go or no-go', order: 3, ownerKind: 'human', gate: 'approval', wipLimit: 1 },
  { key: 'released', name: 'Released', order: 4, ownerKind: 'human' },
];

/** GET /v1/boards for the fixture (DLG D-3), deliberately NOT in switcher order. */
export const BOARDS: BoardSummary[] = [
  { id: 'brd_511653e16d5e4689', name: 'superwitness canary', cardCount: 0, needsYouCount: 0, lastActivityAt: '2026-09-19T06:00:00Z' },
  { id: 'brd_f47143722126442c', name: 'Agent Onboarding', cardCount: 20, needsYouCount: 0, lastActivityAt: '2026-10-11T01:00:00Z' },
  { id: 'brd_af3fde184dd84d90', name: 'Guild Operations & Automation', cardCount: 3, needsYouCount: 1, lastActivityAt: '2026-10-11T02:10:00Z' },
  { id: 'brd_2441b5578f704b93', name: 'Production Releases', cardCount: 0, needsYouCount: 0, lastActivityAt: '2026-10-07T06:00:00Z' },
  { id: 'brd_134a0ddb6d434478', name: 'Developer Experience', cardCount: 7, needsYouCount: 4, lastActivityAt: '2026-10-11T08:20:00Z' },
  { id: 'brd_6a899b0f0d054046', name: 'Editorial & Fact-Checking', cardCount: 3, needsYouCount: 0, lastActivityAt: '2026-10-10T06:00:00Z' },
  { id: 'brd_c13e29c2e7e940fa', name: 'Reliability & Incident Response', cardCount: 0, needsYouCount: 0, lastActivityAt: '2026-10-03T06:00:00Z' },
  { id: 'brd_fa33a0a0721d4d18', name: 'Research & Intelligence', cardCount: 1, needsYouCount: 1, lastActivityAt: '2026-10-11T07:18:00Z' },
  { id: 'brd_24280cb0c7614d36', name: 'Recurring Maintenance', cardCount: 4, needsYouCount: 0, lastActivityAt: '2026-10-10T04:00:00Z' },
  { id: 'brd_6c298ec02d6b466b', name: 'Client Quality', cardCount: 2, needsYouCount: 1, lastActivityAt: '2026-10-11T03:30:00Z' },
  { id: 'brd_0435b5ea3d4d4e44', name: 'Planning & Roadmap', cardCount: 3, needsYouCount: 0, lastActivityAt: '2026-10-08T06:00:00Z' },
  { id: 'brd_e247f164e060443f', name: 'Marketing & Community', cardCount: 0, needsYouCount: 0, lastActivityAt: '2026-10-02T06:00:00Z' },
];
