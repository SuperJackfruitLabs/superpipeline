// apps/web/src/lib/components/settings/settings-fixture.ts — test data only (the DX pipeline as the fixture world seeds it)
import type { Stage } from '$lib/api';
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
