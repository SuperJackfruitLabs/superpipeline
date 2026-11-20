// apps/web/src/lib/components/settings/settings-fixture.ts — test data only (the DX pipeline as the fixture world seeds it)
import type { Card, Label, Stage } from '$lib/api';
export const REPRODUCE_RULE = 'Make the problem happen on purpose. Until it can be reproduced on demand, nothing after this stage can tell a fix from a coincidence.';
export const DX_STAGES: Stage[] = [
  { key: 'reported', name: 'Reported', order: 0, ownerKind: 'human', instructions: 'Describe one problem a developer hit.' },
  { key: 'reproduce', name: 'Reproduce', order: 1, ownerKind: 'capability', owner: 'diagnostics', instructions: REPRODUCE_RULE },
  { key: 'test', name: 'Failing test', order: 2, ownerKind: 'capability', owner: 'testing' },
  { key: 'fix', name: 'Fix', order: 3, ownerKind: 'capability', owner: 'code' },
  { key: 'integrate', name: 'Integrate', order: 4, ownerKind: 'capability', requires: { any: ['integration', 'api', 'testing'] } },
  { key: 'signed-off', name: 'Signed off', order: 5, ownerKind: 'human', gate: 'approval' },
  { key: 'shipped', name: 'Shipped', order: 6, ownerKind: 'human' },
];

/** Twenty workspace labels, one inferred (the Settings mockup's count). */
const LABEL_NAMES = ['accounts', 'agentpod', 'baseline', 'ci', 'docs', 'estate', 'forge', 'independent-verification', 'landing', 'marketing',
  'mobile', 'onboarding', 'performance', 'release', 'research', 'salaam', 'security', 'superlibrary', 'supermessage', 'vibekit'];
export const LABELS: Label[] = LABEL_NAMES.map((name, i) => ({
  id: `lbl_${String(i).padStart(2, '0')}`, tenantId: 'tnt_realistic', name, colour: '#3a6fc8', origin: name === 'baseline' ? 'inferred' : 'declared', createdAt: '2026-10-01T00:00:00Z',
}));
/** The open board's cards as label counts see them: agentpod on three live cards and one archived, accounts on one. */
export const LABEL_CARDS: Pick<Card, 'labels' | 'archivedAt'>[] = [
  { labels: ['lbl_01', 'lbl_00'], archivedAt: null }, { labels: ['lbl_01'], archivedAt: null }, { labels: ['lbl_01'], archivedAt: null },
  { labels: ['lbl_01'], archivedAt: '2026-11-01T00:00:00Z' }, { labels: [], archivedAt: null },
];
