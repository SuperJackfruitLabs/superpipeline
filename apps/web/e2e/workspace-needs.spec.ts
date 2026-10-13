// apps/web/e2e/workspace-needs.spec.ts
import { expect, test } from '@playwright/test';
import { API, TENANT } from './support/seed';

const AGENT = { ...TENANT, 'X-Agent-Id': 'agt_b' };
const PIPELINE = [
  { key: 'build', name: 'Build', order: 0, ownerKind: 'capability', owner: 'build' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
];

test('a person resumes a blocked card from the workspace, and the agent reads the note', async ({ page, request }) => {
  const title = `Rotate the keys ${Date.now()}`;
  const { boardId } = (await (await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name: 'Workspace resume', stages: PIPELINE } })).json()) as { boardId: string };
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title, ownerUserId: 'usr_a' } });
  const claim = await (await request.post(`${API}/v1/boards/${boardId}/claims`, { headers: AGENT, data: { capabilities: ['build'] } })).json();
  await request.post(`${API}/v1/boards/${boardId}/runs/${claim.runId}/block`, { headers: AGENT, data: { leaseEpoch: claim.leaseEpoch, reason: 'the vault is sealed' } });

  await page.goto('/workspace/needs-you');
  const row = page.locator('li.nrow, tr.wo-need').filter({ hasText: title });
  await expect(row).toContainText('the vault is sealed');
  await row.getByRole('button', { name: 'Resume' }).click();
  await page.getByLabel('Note for the agent').fill('Unsealed it — go ahead.');
  await page.getByRole('button', { name: 'Send back to work' }).click();

  await expect.poll(async () => (await (await request.get(`${API}/v1/boards/${boardId}`, { headers: TENANT })).json()).cards[0].state).toBe('submitted');
  const next = await (await request.post(`${API}/v1/boards/${boardId}/claims`, { headers: AGENT, data: { capabilities: ['build'] } })).json();
  expect(next.handoff.feedback).toBe('Unsealed it — go ahead.');
  await expect(page.locator('li.nrow, tr.wo-need').filter({ hasText: title })).toHaveCount(0);
});
