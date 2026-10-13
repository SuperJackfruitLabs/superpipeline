// apps/web/src/lib/test/list-props.ts
/** The DX board's List rows and layout props, as PlanView builds them, for unit tests. */
import { vi } from 'vitest';
import { stageSummaries, summarize } from '$lib/components/board/card-summary';
import { buildRows, groupRows, quickCounts } from '$lib/components/plan/list/list-model';
import type { ListLayoutProps, ListSort } from '$lib/components/plan/list/types';
import type { ListGroupBy } from '$lib/stores/app.svelte';
import { DX_AGENTS, DX_BOARD, DX_ID, DX_LABELS, DX_MEMBERS, DX_NOW } from './dx-snapshot';

export const DX_STAGE_LIST = stageSummaries(DX_BOARD, DX_BOARD.cards, DX_AGENTS);
export function dxRows() {
  const labels = new Map(DX_LABELS.map((l) => [l.id, { name: l.name, colour: l.colour }]));
  return buildRows(summarize(DX_BOARD, DX_BOARD.cards, { agents: DX_AGENTS, members: DX_MEMBERS, labels, nowMs: DX_NOW }), { boardId: DX_ID, agents: DX_AGENTS });
}

export function listProps(over: Partial<ListLayoutProps> & { groupBy?: ListGroupBy; sort?: ListSort } = {}): ListLayoutProps {
  const rows = dxRows();
  const sort = over.sort ?? { key: 'priority', ascending: true };
  const groupBy = over.groupBy ?? 'stage';
  return {
    boardId: DX_ID, boardName: 'Developer Experience', stageCount: 7,
    groups: groupRows(rows, groupBy, sort, DX_STAGE_LIST, DX_MEMBERS, DX_AGENTS),
    emptyStages: groupBy === 'stage' ? ['Integrate', 'Signed off'] : [],
    cardCount: 7, needsCount: 4, quickCounts: quickCounts(rows), totalCostUsd: 0,
    groupBy, sort, filtersOn: false, hasCards: true,
    stages: DX_BOARD.stages.map((s) => ({ key: s.key, name: s.name })),
    onGroupBy: vi.fn(), onSort: vi.fn(), onSetSort: vi.fn(), onMove: vi.fn(async () => {}), onOpen: vi.fn(), onOpenMoveDialog: vi.fn(),
    ...over,
  };
}
