// apps/web/src/lib/components/workspace/types.ts
import type { Snippet } from 'svelte';
import type { Vibe } from '@superjackfruit/vibekit';
import type { WorkspaceTab } from './workspace-counts.svelte';
export interface WorkspaceFrameProps { tab: WorkspaceTab | 'review'; vibe: Vibe; children: Snippet }
/**
 * Every tab takes these; only the review route passes `review` and `initial`.
 * `review.no` is Studio's section number; `review.span2` makes a D/P/Q panel span both columns;
 * `initial.expandedResume` is the card id whose resume form starts open, with `resumeText` in it.
 */
export interface WorkspaceTabProps { vibe?: Vibe; review?: { tag: string; note?: string; no?: string; span2?: boolean }; initial?: { expandedResume?: string; resumeText?: string } }
