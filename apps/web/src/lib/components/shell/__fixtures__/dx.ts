// apps/web/src/lib/components/shell/__fixtures__/dx.ts
/**
 * Developer Experience in the pixel fixture world (fixtures-and-harness.md §A.5.2, with Task 3's
 * created_at for 4605), as `Card`s. For unit tests only.
 */
import type { AgentSummary, Card, Stage } from '$lib/api';

const CHOTU = 'agt_bb586732b807460c';
export const card = (o: Partial<Card> & { id: string }): Card =>
  ({
    title: o.id, ownerUserId: 'usr_b19776fac3c94df4', currentStageKey: 'reported', state: 'submitted', priority: 0, costUsd: 0,
    overBudget: false, attemptCount: 0, delegateAgentId: null, queuedBy: null, queuedByAgentId: null, queuedGrant: null,
    labels: [], dueAt: null, archivedAt: null, parentCardId: null, openChildCount: 0, costUsdRollup: 0, blockedBy: [],
    projectId: null, milestoneId: null, lastAgentId: null, queuedGrantOwner: null,
    stageSince: '2026-10-08T00:00:00.000Z', createdAt: '2026-10-08T00:00:00.000Z', ...o,
  }) as Card;

export const DX_STAGES: Stage[] = [
  { key: 'reported', name: 'Reported', order: 0, ownerKind: 'human' },
  { key: 'reproduce', name: 'Reproduce', order: 1, ownerKind: 'capability', owner: 'diagnostics' },
  { key: 'test', name: 'Failing test', order: 2, ownerKind: 'capability', owner: 'testing' },
  { key: 'fix', name: 'Fix', order: 3, ownerKind: 'capability', owner: 'code' },
  { key: 'integrate', name: 'Integrate', order: 4, ownerKind: 'capability', owner: 'integration' },
  { key: 'signed-off', name: 'Signed off', order: 5, ownerKind: 'human', gate: 'approval' },
  { key: 'shipped', name: 'Shipped', order: 6, ownerKind: 'human' },
] as Stage[];

export const DX_CARDS: Card[] = [
  card({ id: 'card_ace250c9c25363ac', currentStageKey: 'reported', state: 'submitted', priority: 1, dueAt: '2026-10-06', queuedByAgentId: CHOTU, projectId: 'prj_23b93f2d16d54b27', createdAt: '2026-10-04T10:19:08.402Z', stateSince: '2026-10-08T09:51:01.514Z' }),
  card({ id: 'card_9ac2116a050858f8', currentStageKey: 'test', state: 'input-required', priority: 2, queuedByAgentId: CHOTU, projectId: 'prj_34b48f840daa4309', lastAgentId: 'agt_fx_tester_tim', attemptCount: 1, createdAt: '2026-10-08T10:31:33.618Z', stateSince: '2026-10-09T22:24:49.862Z', needsHuman: { reason: 'blocked' } }),
  card({ id: 'card_e10fb4fe39a91dfc', currentStageKey: 'fix', state: 'input-required', lastAgentId: 'agt_fx_coder_kai', attemptCount: 5, createdAt: '2026-10-08T17:50:41.154Z', stateSince: '2026-10-09T22:45:45.522Z', needsHuman: { reason: 'repeated-failure', failureCount: 2 } }),
  card({ id: 'card_691a65ff9894f83f', currentStageKey: 'test', state: 'submitted', priority: 2, queuedByAgentId: CHOTU, projectId: 'prj_34b48f840daa4309', createdAt: '2026-10-08T10:31:34.691Z', stateSince: '2026-10-08T17:50:23.062Z', blockedBy: [{ cardId: 'card_482b4aa0bdd6481f', title: 'X' }, { cardId: 'card_9ac2116a050858f8', title: 'A' }, { cardId: 'card_e10fb4fe39a91dfc', title: 'S' }] }),
  card({ id: 'card_482b4aa0bdd6481f', currentStageKey: 'test', state: 'submitted', createdAt: '2026-10-09T23:04:35.741Z', stateSince: '2026-10-09T23:04:43.288Z', blockedBy: [{ cardId: 'card_9ac2116a050858f8', title: 'A' }] }),
  card({ id: 'card_8f2c1a5e58299ed9', currentStageKey: 'shipped', state: 'completed', priority: 2, projectId: 'prj_34b48f840daa4309', lastAgentId: 'agt_fx_coder_kai', attemptCount: 15, createdAt: '2026-10-08T10:31:32.526Z', stateSince: '2026-10-09T22:19:24.419Z' }),
  card({ id: 'card_05823a57e8224605', currentStageKey: 'reproduce', state: 'input-required', priority: 3, queuedByAgentId: CHOTU, projectId: 'prj_42ab5ec961104f65', lastAgentId: 'agt_fx_error_eric', attemptCount: 2, createdAt: '2026-10-08T17:55:00.000Z', stateSince: '2026-10-08T14:11:45.119Z', needsHuman: { reason: 'blocked' } }),
  card({ id: 'card_47630a307f58426f', currentStageKey: 'integrate', state: 'input-required', archivedAt: '2026-10-09T14:21:02.650Z', lastAgentId: 'agt_fx_integration_ian', createdAt: '2026-10-09T14:18:14.596Z', stateSince: '2026-10-09T14:20:11.010Z', needsHuman: { reason: 'blocked' } }),
  card({ id: 'card_54ec7bee6c7e4828', currentStageKey: 'reproduce', state: 'input-required', archivedAt: '2026-10-09T14:21:04.552Z', lastAgentId: 'agt_fx_error_eric', createdAt: '2026-10-09T14:18:17.617Z', stateSince: '2026-10-09T14:20:06.788Z', needsHuman: { reason: 'blocked' } }),
];

/** The four Developer Experience cards that wait on a person (63ac no-owner; 58f8, 1dfc, 4605 stopped). */
export const DX_NEEDS = new Set(['card_ace250c9c25363ac', 'card_9ac2116a050858f8', 'card_e10fb4fe39a91dfc', 'card_05823a57e8224605']);

const agent = (id: string, name: string) => ({ id, name, capabilities: [], externalId: null, externalSource: null, iconUrl: null, concurrency: 1, tokenIds: [] }) as unknown as AgentSummary;
export const DX_AGENTS: AgentSummary[] = [
  agent('agt_fx_tester_tim', 'tester-tim'),
  agent('agt_fx_coder_kai', 'coder-kai'),
  agent('agt_fx_error_eric', 'error-eric'),
  agent('agt_fx_integration_ian', 'integration-ian'),
  agent(CHOTU, 'super-chotu'),
];
