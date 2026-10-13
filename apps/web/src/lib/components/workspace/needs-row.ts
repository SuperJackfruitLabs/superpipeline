// apps/web/src/lib/components/workspace/needs-row.ts
import type { AttentionAction, AttentionItem, AttentionKind } from '$lib/components/attention/attention';

export const WS_KIND_LABEL: Record<AttentionKind, string> = {
  review: 'Review', question: 'Asked', blocked: 'Blocked', 'repeated-failure': 'Failing', refused: 'Refused',
  'sub-tasks': 'Waiting', 'no-owner': 'Unowned', failed: 'Failed', budget: 'Budget',
};
const SIGNAL: ReadonlySet<AttentionKind> = new Set(['review', 'failed', 'repeated-failure', 'blocked', 'refused', 'budget']);
/** Signal colour only for kinds a person must act on; unowned, asked and waiting stay a line chip. */
export const chipClass = (k: AttentionKind): 'chip-signal' | 'chip-line' => (SIGNAL.has(k) ? 'chip-signal' : 'chip-line');
/** Studio's state square: `needs` for the signal kinds, `off` otherwise. */
export const studioUnit = (k: AttentionKind): 'needs' | 'off' => (SIGNAL.has(k) ? 'needs' : 'off');

function age(h: number | null): string | null {
  if (h === null) return null;
  if (h < 1) return 'just now';
  if (h < 48) return `${Math.floor(h)}h`;
  return `${Math.floor(h / 24)}d`;
}

export function metaLine(item: AttentionItem): string {
  return [item.boardName, item.kind === 'no-owner' ? null : item.stageName, item.headline, age(item.ageHours)].filter(Boolean).join(' · ');
}

/** ≤140 characters: whole. Else the first sentence (40–240 characters) plus "…"; else the first 140 characters plus "…". */
export function clip(detail: string): { shown: string; long: boolean } {
  if (detail.length <= 140) return { shown: detail, long: false };
  const first = /^([\s\S]*?)\.(?=\s|$)/.exec(detail)?.[1];
  if (first !== undefined && first.length >= 40 && first.length <= 240) return { shown: `${first}…`, long: true };
  return { shown: `${detail.slice(0, 140).trimEnd()}…`, long: true };
}

export function sortOldestFirst(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => {
    if (a.ageHours === null && b.ageHours !== null) return 1;
    if (b.ageHours === null && a.ageHours !== null) return -1;
    const d = (b.ageHours ?? 0) - (a.ageHours ?? 0);
    return d !== 0 ? d : a.title.localeCompare(b.title);
  });
}

const boards = (u: number) => `${u} ${u === 1 ? 'board' : 'boards'}`;
export const needsHeadMeta = (u: number) => `Oldest first. ${u === 0 ? 'Every board answered.' : `${boards(u)} did not answer.`}`;
export const unansweredFoot = (u: number) => `${boards(u)} did not answer; this list may be incomplete.`;

/** Every action except `resume` (a form) and `move` (board only) is a link. */
export function actionLink(item: AttentionItem, a: AttentionAction): { label: string; href: string; primary: boolean } | null {
  const card = `/b/${item.boardId}/c/${item.cardId}`;
  switch (a) {
    case 'open': return { label: 'Open', href: card, primary: false };
    case 'review': return { label: 'Review', href: card, primary: true };
    case 'answer': return { label: 'Answer', href: card, primary: true };
    case 'log': return { label: 'Open log', href: `${card}?tab=attempts`, primary: false };
    case 'staff': return { label: 'Staff an agent', href: '/workspace/capabilities', primary: false };
    default: return null;
  }
}
