// apps/web/src/lib/components/card/testing/fakes.ts
/** A fake `app` store and fake API calls for card model/component tests. Test-only. */
import { vi } from 'vitest';
import { ACTIVITIES_4605, AGENTS, ATTEMPTS_4605, BOARD_DX, MEMBERS, PROJECTS, USER } from './card-4605';

export const fakeApp = {
  user: USER,
  members: MEMBERS,
  agents: AGENTS,
  labels: [] as Array<{ id: string; name: string; colour: string }>,
  projects: PROJECTS,
  boards: [{ id: BOARD_DX.boardId!, name: BOARD_DX.name!, cardCount: 1, needsYouCount: 1, lastActivityAt: null }],
  board: BOARD_DX,
  boardId: BOARD_DX.boardId,
  authState: 'ready' as const,
  labelById: () => new Map<string, { name: string; colour: string }>(),
  onFeed: vi.fn(() => () => {}),
  refresh: vi.fn(async () => {}),
  loadBoards: vi.fn(async () => {}),
  openBoard: vi.fn(async () => {}),
  closeCard: vi.fn(),
  openCard: vi.fn(),
  markBusy: vi.fn(<T>(p: Promise<T>) => p),
  noteLoaded: vi.fn(),
  cardDetailFor: null as string | null,
};

export const fakeApi = {
  getCardActivities: vi.fn(async () => ({ activities: ACTIVITIES_4605, handoff: null, gates: [] })),
  getAttempts: vi.fn(async () => ATTEMPTS_4605),
  getEstimate: vi.fn(async () => ({ stageKey: 'reproduce', estimatedUsd: null, sampleSize: 0 })),
  listLinks: vi.fn(async () => ({ links: [], externalLinks: [] })),
  getProject: vi.fn(async () => ({ project: PROJECTS[0]!, milestones: [] })),
  getComments: vi.fn(async () => []),
  postComment: vi.fn(async () => new Response('{}', { status: 201 })),
  deleteComment: vi.fn(async () => new Response('{}', { status: 200 })),
  updateCard: vi.fn(async () => new Response('{}', { status: 200 })),
  deleteCard: vi.fn(async () => new Response('{}', { status: 200 })),
  archiveCard: vi.fn(async () => new Response('{}', { status: 200 })),
  unarchiveCard: vi.fn(async () => new Response('{}', { status: 200 })),
  resumeCard: vi.fn(async () => new Response('{}', { status: 200 })),
  resolveGate: vi.fn(async () => new Response('{}', { status: 200 })),
  answerElicitation: vi.fn(async () => new Response('{}', { status: 200 })),
};
