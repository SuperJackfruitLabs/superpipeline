// apps/web/src/lib/components/operate/spend-types.ts
import type { BoardEvent } from '$lib/api';
/**
 * The board log: `collapsedRows` events, then either a toggle to show them all (Spend, with
 * `fullLogHref` to the whole log) or, `paged`, "Show N more" by `collapsedRows` (the log page).
 */
export interface BoardLogProps { events: BoardEvent[] | null; error: string | null; collapsedRows: number; fullLogHref: string | null; paged?: boolean }
export interface BoardLogViewProps { boardId: string; events: BoardEvent[] | null; error: string | null }
