// apps/web/e2e/support/realistic.ts — the fixture world plus boards with long names: a decision waiting on one,
// and an unclaimed card whose move select offers a long stage name. Shared by the phone and desktop fit specs.
import type { APIRequestContext } from '@playwright/test';
import { FIXTURE_TENANT, FIXTURE_USER } from '../pixel/fixture/seed';
import { API } from './seed';
import { seed } from './world';

const H = { 'X-Tenant-Id': FIXTURE_TENANT, 'X-User-Id': FIXTURE_USER, 'Content-Type': 'application/json' };
const AGENT = { ...H, 'X-Agent-Id': 'agt_fit_reviewer' };
const PIPELINE = [
  { key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
];
export const LONG = ['Workspace Operations & Automation Across Every Station', 'Client Quality and Release Readiness Reviews'];

let seeded = false;
export async function seedRealistic(request: APIRequestContext): Promise<void> {
  if (seeded) return;
  await seed(request);
  // A decision waiting on a board with a long name.
  {
    const { boardId } = (await (await request.post(`${API}/v1/boards`, { headers: H, data: { name: LONG[1], stages: PIPELINE } })).json()) as { boardId: string };
    await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: H, data: { title: `Publish the quarterly report for ${LONG[1]} to the client portal once it is approved`, ownerUserId: FIXTURE_USER } });
    const claim = await (await request.post(`${API}/v1/boards/${boardId}/claims`, { headers: AGENT, data: { capabilities: ['research'] } })).json();
    await request.post(`${API}/v1/boards/${boardId}/runs/${claim.runId}/complete`, { headers: H, data: { leaseEpoch: claim.leaseEpoch, handoff: { summary: 'The report is final: twelve findings, none still open as a blocker.' } } });
  }
  // An unclaimed card whose Move-to-stage select offers a LONG option label (the operator's iPhone case).
  {
    const stages = [
      { key: 'reported', name: 'Reported', order: 0 },
      { key: 'audit', name: 'Audit the accessibility and the user experience of every page, end to end', order: 1, ownerKind: 'capability', owner: 'diagnostics' },
    ];
    const { boardId } = (await (await request.post(`${API}/v1/boards`, { headers: H, data: { name: LONG[0], stages } })).json()) as { boardId: string };
    await request.put(`${API}/v1/boards/${boardId}/stale`, { headers: H, data: { enabled: true, afterHours: 0 } });
    await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: H, data: { title: 'Fix the highest-severity blocker found in the clean-room journey on every station', ownerUserId: FIXTURE_USER } });
  }
  seeded = true;
}

