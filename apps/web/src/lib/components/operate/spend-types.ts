// apps/web/src/lib/components/operate/spend-types.ts
import type { Vibe } from '@superjackfruit/vibekit';
import type { BoardEvent } from '$lib/api';
export interface SpendLayoutProps { vibe: Vibe }
export interface BoardLogProps { events: BoardEvent[] | null; error: string | null; collapsedRows: number; fullLogHref: string | null }
export interface BoardLogPageProps { vibe: Vibe; boardId: string; events: BoardEvent[] | null; error: string | null }
