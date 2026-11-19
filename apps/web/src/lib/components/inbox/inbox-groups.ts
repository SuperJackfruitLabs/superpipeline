// apps/web/src/lib/components/inbox/inbox-groups.ts
/**
 * The Inbox groups its cards by what the person must do (contract rule 4, §11.4): nine attention
 * kinds become five groups in a fixed order, each with one verb, and guidance said once per group.
 */
import type { Phase, Vibe } from '@superjackfruitlabs/vibekit-ui';
import type { AttentionItem, AttentionKind } from '$lib/components/attention/attention';
import { greetNamed } from '$lib/greet';
import { GROUP_EXPLANATION, GROUP_WORDS, groupsLede, unclaimedExplanation, wantYou } from './inbox-words';

export type InboxGroupKey = 'review' | 'answer' | 'resume' | 'budget' | 'unclaimed';

export const GROUP_ORDER: readonly InboxGroupKey[] = ['review', 'answer', 'resume', 'budget', 'unclaimed'];

export const GROUP_OF: Record<AttentionKind, InboxGroupKey> = {
  review: 'review',
  'sub-tasks': 'review',
  question: 'answer',
  refused: 'resume',
  failed: 'resume',
  'repeated-failure': 'resume',
  blocked: 'resume',
  budget: 'budget',
  'no-owner': 'unclaimed',
};

export interface InboxGroup {
  key: InboxGroupKey;
  title: string;
  verb: string;
  items: AttentionItem[];
  /** What the group is for, said once above its rows. */
  explanation: string;
  groupActions: ('move-all' | 'staff')[];
}

/** The groups in their fixed order, empty ones left out; rows keep the order they were given in. */
export function inboxGroups(items: AttentionItem[]): InboxGroup[] {
  return GROUP_ORDER.flatMap((key): InboxGroup[] => {
    const rows = items.filter((i) => GROUP_OF[i.kind] === key);
    if (rows.length === 0) return [];
    const { title, verb } = GROUP_WORDS[key];
    if (key !== 'unclaimed') return [{ key, title, verb, items: rows, explanation: GROUP_EXPLANATION[key], groupActions: [] }];
    const stages = [...new Set(rows.map((i) => i.stageName))];
    const boards = new Set(rows.map((i) => i.boardId)).size;
    return [{ key, title, verb, items: rows, explanation: unclaimedExplanation(stages, boards), groupActions: ['move-all', 'staff'] }];
  });
}

/**
 * The page's one message (contract rule 1). Daylight greets first with the time of day's own words
 * ("Working late, Rakesh? 18 cards want you."); the other vibes say the count alone. The lede names
 * the non-empty groups, then what is running. `boards` (how many are in scope) is not said: the Show
 * row already names them, and a count appears once (rule 2).
 */
export function inboxHeadline(
  groups: InboxGroup[], boards: number, running: number, firstName: string | null, vibe: Vibe, phase: Phase = 'noon',
): { h1: string; lede: string } {
  const n = groups.reduce((sum, g) => sum + g.items.length, 0);
  const count = wantYou(n);
  const h1 = vibe === 'daylight' ? `${greetNamed(phase, firstName ?? '')} ${count}` : count;
  const lede = groupsLede(groups.map((g) => ({ key: g.key, n: g.items.length })), running);
  return { h1, lede };
}
