// apps/web/src/lib/components/board/tile-state.ts
/**
 * A tile's one state line: who holds the card and what that means for you, then what else matters
 * (the work it produced when done, the due date when it is late). The same words in every vibe;
 * `needs` is whether the card waits on a person, which every vibe marks in its own way.
 */
import { refLabel } from './ref-chip';
import { dueShort, tileWho } from './board-words';
import type { CardSummary } from './card-summary';

export interface StateLine { text: string; needs: boolean }

export function stateLine(s: CardSummary): StateLine {
  const who = tileWho(s);
  const parts: string[] = [];
  if (who.kind === 'person') parts.push(`${who.text} ${who.note}`);
  else if (who.kind === 'agent') parts.push(`${who.name} ${who.note}`);
  else parts.push(who.text);
  if (s.urgency === 'done' && s.firstRef) parts.push(s.firstRef.title ?? refLabel(s.firstRef));
  if (s.dueAt && s.overdue) parts.push(`overdue since ${dueShort(s.dueAt)}`);
  return { text: parts.join(' · '), needs: s.urgency === 'needs' };
}
