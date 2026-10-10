import type { APIRequestContext, Page } from '@playwright/test';

export const API = 'http://localhost:8787';
export const TENANT = { 'X-Tenant-Id': 'tnt_dev', 'Content-Type': 'application/json' };
export const AGENT = { ...TENANT, 'X-Agent-Id': 'agt_r' };

export const DEFAULT_STAGES = [
  { key: 'backlog', name: 'Backlog', order: 0 },
  { key: 'ready', name: 'Ready', order: 1 },
  { key: 'in-progress', name: 'In Progress', order: 2, wipLimit: 3 },
  { key: 'review', name: 'Review', order: 3, gate: 'approval' },
  { key: 'done', name: 'Done', order: 4 },
];

export const REVIEW_PIPELINE = [
  { key: 'research', name: 'Research', order: 0, ownerKind: 'capability', owner: 'research' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval' },
  { key: 'publish', name: 'Publish', order: 2, ownerKind: 'capability', owner: 'publish' },
];

export async function seedBoard(request: APIRequestContext, name: string, stages: unknown[] = DEFAULT_STAGES): Promise<string> {
  const res = await request.post(`${API}/v1/boards`, { headers: TENANT, data: { name, stages } });
  return ((await res.json()) as { boardId: string }).boardId;
}

/** A card that reaches the approval gate (the research agent completes with a handoff). */
export async function seedGatedCard(request: APIRequestContext, boardId: string, title: string): Promise<void> {
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title, ownerUserId: 'usr_a' } });
  const claim = await (await request.post(`${API}/v1/boards/${boardId}/claims`, { headers: AGENT, data: { capabilities: ['research'] } })).json();
  await request.post(`${API}/v1/boards/${boardId}/runs/${claim.runId}/complete`, { headers: TENANT, data: { leaseEpoch: claim.leaseEpoch, handoff: { summary: 'drafted' } } });
}

/** A card whose agent stopped on a question with two options. */
export async function seedQuestionCard(request: APIRequestContext, boardId: string, title: string): Promise<void> {
  await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title, ownerUserId: 'usr_a' } });
  const claim = await (await request.post(`${API}/v1/boards/${boardId}/claims`, { headers: AGENT, data: { capabilities: ['research'] } })).json();
  await request.post(`${API}/v1/boards/${boardId}/runs/${claim.runId}/activities`, {
    headers: AGENT,
    data: { leaseEpoch: claim.leaseEpoch, type: 'elicitation', body: 'May I run the test suite?', signal: 'select', parameter: { options: [{ name: 'run_them', title: 'Run the tests' }, { name: 'skip', title: 'Skip them' }] } },
  });
}

export async function openBoard(page: Page, boardId: string): Promise<void> {
  await page.addInitScript((id) => window.localStorage.setItem('superpipeline.boardId', id), boardId);
  await page.goto('/');
}

/** Sets the person's appearance before any page script runs. */
export async function setAppearance(page: Page, value: string): Promise<void> {
  await page.context().addCookies([{ name: 'vk_appearance', value, url: 'http://localhost:5173' }]);
}
