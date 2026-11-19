// apps/web/src/lib/components/plan/list/list-words.ts
/**
 * The List's sentences (composition contract): the same words in every vibe. The headline is the
 * board row's attention line (board-words); these are the rest: the keyboard line, a row's facts,
 * a group's heading and the footer.
 */
import { joinAnd } from '$lib/words';
import { SORT_NOUN, sortHint } from './list-model';
import type { ListGroup, ListRow, ListSort } from './types';

/** Filters hide every card (a board with none says so in the top row's line). */
export const NO_MATCH = 'No cards match these filters.';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const numberWord = (n: number): string => WORDS[n] ?? String(n);
const blockedText = (n: number): string => (n === 1 ? 'Blocked by another card' : `Blocked by ${numberWord(n)} other cards`);

/** A row's facts under its title: up to three labels, how many more, and what blocks it. */
export function rowFacts(r: ListRow): string[] {
  return [...r.labelNames, ...(r.moreLabels ? [`+${r.moreLabels} more`] : []), ...(r.blockedCount ? [blockedText(r.blockedCount)] : [])];
}

/** A group's heading: the stage and who works it ("Fix · code · 2 agents"), else its name. */
export const groupLabel = (g: ListGroup): string => (g.owner ? `${g.label} · ${g.owner}` : g.label);

/** The footer: the sort in words, and the stages left out. */
export function listFoot(sort: ListSort, empty: string[]): string {
  return `Sorted by ${SORT_NOUN[sort.key]}, ${sortHint(sort)}.${empty.length ? ` Stages with no cards are left out: ${joinAnd(empty)}.` : ''}`;
}
