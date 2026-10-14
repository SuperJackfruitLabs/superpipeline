import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { PORTS } from '../../scripts/ports';
export const API = PORTS.apiUrl;
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
  await page.goto(`/b/${boardId}`);
}

/**
 * The app opens on the Inbox (nav v2). A spec that remembered a board (`superpipeline.boardId`)
 * (or none: the first board) and wants its Plan follows Plan's link.
 */
export async function openRememberedBoard(page: Page): Promise<void> {
  await page.goto('/inbox');
  // Plan's link names the board the app opened: the remembered one, else the first.
  const plan = page.getByRole('navigation', { name: 'Superpipeline' }).getByRole('link', { name: 'Plan', exact: true });
  await expect(plan).toHaveAttribute('href', /^\/b\//, { timeout: 15_000 });
  await page.goto((await plan.getAttribute('href'))!);
}

/** Sets the person's appearance before any page script runs. */
export async function setAppearance(page: Page, value: string): Promise<void> {
  await page.context().addCookies([{ name: 'vk_appearance', value, url: PORTS.webUrl }]);
}

/** A pipeline whose review stage binds its gate to an immutable approval subject (needs a project and a decider). */
export const BOUND_PIPELINE = [
  { key: 'draft', name: 'Draft', order: 0, ownerKind: 'capability', owner: 'research' },
  { key: 'review', name: 'Review', order: 1, ownerKind: 'human', gate: 'approval', approvalSubjectSchema: 'social-publish/v1', approvalDeciderPrincipalIds: ['usr_dev'] },
  { key: 'publish', name: 'Publish', order: 2, ownerKind: 'capability', owner: 'publish' },
];

const PUBLICATION_PAYLOAD = {
  channel: 'x',
  account: { platform: 'x', userId: 'acct_1', username: 'example_product' },
  items: [{ index: 0, text: 'Exact post text', media: [], replyToPostId: null, quotePostId: null }],
  timing: { mode: 'immediate', notBefore: null, expiresAt: '2030-01-02T03:04:05Z' },
  evidenceRefs: [],
  policy: { allowThread: true, duplicatePolicyId: 'duplicate-policy', floodPolicyId: 'flood-policy' },
};

/** A card at a gate that carries an approval subject (revision 1, a digest and the canonical payload). */
export async function seedBoundGateCard(request: APIRequestContext, boardId: string, title: string): Promise<void> {
  const project = (await (await request.post(`${API}/v1/projects`, { headers: TENANT, data: { name: `Fixture project ${Math.random().toString(36).slice(2, 8)}` } })).json()) as { project: { id: string } };
  const card = (await (await request.post(`${API}/v1/boards/${boardId}/cards`, { headers: TENANT, data: { title, ownerUserId: 'usr_a' } })).json()) as { card: { id: string } };
  await request.patch(`${API}/v1/boards/${boardId}/cards/${card.card.id}`, { headers: TENANT, data: { projectId: project.project.id } });
  const claim = await (await request.post(`${API}/v1/boards/${boardId}/claims`, { headers: AGENT, data: { capabilities: ['research'] } })).json();
  await request.post(`${API}/v1/boards/${boardId}/runs/${claim.runId}/complete`, {
    headers: TENANT,
    data: { leaseEpoch: claim.leaseEpoch, handoff: { publicationPayload: PUBLICATION_PAYLOAD } },
  });
}
