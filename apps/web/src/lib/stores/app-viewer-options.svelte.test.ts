// @vitest-environment jsdom
/** Operator ruling 2026-10-28: "Always allow" shows only to a workspace owner or admin. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ role: 'member' as string }));
const ASK = {
  id: 'elc_1', cardId: 'card_1', status: 'pending', question: 'Create runs/x/answer.md in the workspace?',
  options: [
    { name: 'approve', title: 'Approve once' },
    { name: 'always', title: 'Always allow Salaam to write in its workspace', requires: 'workspace-admin' },
    { name: 'deny', title: 'Deny' },
  ],
};
const BOARD = { boardId: 'brd_1', name: 'Board', stages: [], cards: [], gates: [], elicitations: [ASK], references: [] };
vi.mock('$lib/api', async (orig) => ({
  ...(await orig<typeof import('$lib/api')>()),
  getMe: vi.fn(async () => ({ userId: 'usr_1', tenantId: 'tnt_1', name: 'Ira', role: h.role })),
  getBoard: vi.fn(async () => structuredClone(BOARD)),
  getBoards: vi.fn(async () => [{ id: 'brd_1', name: 'Board' }]),
  listAttention: vi.fn(async () => ({ cards: [], boardsUnanswered: 0 })),
  getNotifications: vi.fn(async () => []),
  listLabels: vi.fn(async () => []),
  getAgents: vi.fn(async () => []),
  getMembers: vi.fn(async () => []),
  listProjects: vi.fn(async () => []),
  openBoardSocket: vi.fn(() => Object.assign(new EventTarget(), { close() {} })),
}));

async function boot(role: string) {
  h.role = role;
  vi.resetModules();
  localStorage.setItem('superpipeline.boardId', 'brd_1');
  const { app } = await import('./app.svelte');
  await app.init();
  return app.board!.elicitations[0]!.options.map((o: { name: string }) => o.name);
}

beforeEach(() => localStorage.clear());

describe('who sees Always allow', () => {
  it('a member and a viewer do not', async () => {
    expect(await boot('member')).toEqual(['approve', 'deny']);
    expect(await boot('viewer')).toEqual(['approve', 'deny']);
  });
  it('an owner and an admin do', async () => {
    expect(await boot('owner')).toEqual(['approve', 'always', 'deny']);
    expect(await boot('admin')).toEqual(['approve', 'always', 'deny']);
  });
});
