// apps/web/src/lib/components/workspace/workspace-copy.ts
import type { WorkspaceTab } from './workspace-counts.svelte';

export const WORKSPACE_DESCRIPTION: Record<WorkspaceTab, string> = {
  agents: "The agents that can claim cards on your boards. A card in a stage goes to an agent holding that stage's capability.",
  'needs-you': 'Every card, on any board, that is waiting on a person.',
  capabilities: 'What agents can do, and which board stages ask for it.',
  labels: 'The labels cards carry, shared by every board.',
  people: 'Who can see and change this workspace.',
  connections: 'The forge and the AgentPod fleet this workspace uses.',
};
export const REVIEW_DESCRIPTION = 'Every workspace tab, shown together for review: Needs you, Capabilities, Labels, People and Connections. (Agents has its own artboard.)';

export function backLink(boardId: string | null, boardName: string | null): { href: string; label: string } {
  return boardId && boardName ? { href: `/b/${boardId}`, label: `Back to ${boardName}` } : { href: '/', label: 'Back to your boards' };
}
