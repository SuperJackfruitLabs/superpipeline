// apps/web/src/lib/components/operate/layouts/fake-model.ts
import { vi } from 'vitest';
import { itemsFromBoard, sortAttention } from '$lib/components/attention/attention';
import { activityGroups, needRows, spendView } from '../operate-data';
import { DX_AGENTS, DX_BOARD, DX_NOTIFICATIONS, DX_NOW } from '$lib/test/dx-snapshot';
import type { OperateModel } from './types';

export function fakeModel(over: Partial<OperateModel> = {}): OperateModel {
  const items = itemsFromBoard(DX_BOARD, DX_AGENTS, DX_NOW);
  const needs = needRows(DX_BOARD, DX_AGENTS, sortAttention(items, 'stage'), DX_NOW);
  return {
    boardId: DX_BOARD.boardId!, boardName: 'Developer Experience', cardCount: 7,
    stages: [...DX_BOARD.stages], agents: DX_AGENTS, needs,
    needsUrgent: needRows(DX_BOARD, DX_AGENTS, sortAttention(items, 'urgency'), DX_NOW),
    running: [], spend: spendView(null, DX_BOARD.usage, DX_AGENTS), usageError: null, unread: 19, showRead: false,
    groups: activityGroups(DX_NOTIFICATIONS, false, needs, DX_BOARD, DX_AGENTS),
    phase: 'noon', nowMs: DX_NOW, firstName: 'Rakesh',
    cardHref: (id) => `/b/${DX_BOARD.boardId}/c/${id}`,
    resume: vi.fn(async () => null), move: vi.fn(async () => null), markRead: vi.fn(async () => {}),
    setCaps: vi.fn(async () => null), open: vi.fn(), openLog: vi.fn(),
    ...over,
  };
}
