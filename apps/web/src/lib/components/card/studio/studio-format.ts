// apps/web/src/lib/components/card/studio/studio-format.ts
/** Studio ("Annual report") formatters for a card (screens/card.parts/30-studio.md §3, corrected). */
import type { Attempt, GateConflict } from '$lib/api';
import type { Phase } from '@superjackfruit/vibekit';
import { gateConflictSentence } from '../card-words';
import { ageLabel } from '$lib/age';
import { clockHM, dayMonth, weekdayDayMonth } from '$lib/when';
import { STRIP_WORD, type StripKind } from '../state-words';

export const stageNo = (i: number): string => String(i + 1).padStart(2, '0');
/** Floors (F §A.2): 48 hours and over in days, else hours. */
export function figAge(hours: number): { value: string; unit: string } {
  if (hours >= 48) { const n = Math.floor(hours / 24); return { value: String(n), unit: n === 1 ? 'day' : 'days' }; }
  return { value: String(Math.floor(hours)), unit: 'h' };
}
export const usdShort = (n: number): string => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
const dayKey = (iso: string, tz?: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
export const quoteWhen = (iso: string, now: Date, tz?: string): string =>
  dayKey(iso, tz) === dayKey(now.toISOString(), tz) ? clockHM(iso, tz) : `${weekdayDayMonth(iso, tz)} ${clockHM(iso, tz)}`;
export function runEnded(iso: string, tz?: string): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'short', day: 'numeric' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.month} ${p.day} ${clockHM(iso, tz)}`;
}
export const cpKicker = (shortId: string, i: number, stageName: string): string => `Card ${shortId} · stage ${stageNo(i)} ${stageName}`;
export function studioProvenance(q: string, byAgent: boolean, covers: boolean | null, delegated: boolean): string {
  const phrase = covers === null ? 'with no recorded dispatch authority' : covers ? 'allowed to dispatch the one working it' : 'not allowed to dispatch the one working it';
  return `Asked by ${q}, ${byAgent ? 'an agent' : 'a person'} ${phrase}.${delegated ? '' : ' Unclaimed now.'}`;
}
export const stoppedAfter = (n: number): string => `stopped after ${n} attempt${n === 1 ? '' : 's'}`;
export function studioNoteHint(len: number, who: string, page: boolean): string {
  const base = len === 0 ? `Note needed · ${len}/8000` : `${len}/8000`;
  return page && len === 0 ? `${base} · with no note: “Add a note for ${who} first.”` : base;
}
export const commentsCount = (n: number): string => `${n} comment${n === 1 ? '' : 's'}`;
export const linksSentence = (open: number, n: number, related: number): string =>
  `Sub-tasks ${open} open of ${n} · ${related ? `Related prior work ${related}` : 'Related prior work: none. No related prior work found in Superlibrary.'}`;
export function whereWord(url: string): string {
  try {
    const h = new URL(url).hostname;
    return h === 'github.com' ? 'GitHub' : h;
  } catch {
    return url;
  }
}
export function outcomeWord(a: Pick<Attempt, 'outcome' | 'completion'>): string {
  if (a.outcome === 'blocked') return 'Stopped';
  if (a.outcome === 'sent_back' || (a.outcome === 'completed' && a.completion?.ok === false)) return 'Sent back';
  if (a.outcome === 'completed') return 'Done';
  if (a.outcome === 'failed') return 'Failed';
  return 'Running';
}
export function statusItems(i: { shortId: string; i: number; n: number; stageName: string; needsYou: boolean; ageHours: number | null; syncedAt: string | null; tz?: string }): Array<{ text: string; signal?: boolean }> {
  const out: Array<{ text: string; signal?: boolean }> = [{ text: `card ${i.shortId}` }, { text: `stage ${i.i + 1}/${i.n} ${i.stageName}` }];
  if (i.needsYou) out.push({ text: `waiting on you ${ageLabel(i.ageHours) ?? ''}`.trim(), signal: true });
  if (i.syncedAt) out.push({ text: `synced ${clockHM(i.syncedAt, i.tz)}` });
  return out;
}
export { STRIP_WORD };

// ---- the drawer and the card-states gallery (SP-Card-Studio, SP-Card-States-Studio) ----

const PHASE_WORD: Readonly<Record<Phase, string>> = { dawn: 'dawn', morning: 'morning', noon: 'midday', golden: 'golden hour', dusk: 'dusk', night: 'night' };
/** "13:51 · midday", and what a screen reader says for it. */
export function studioClock(nowIso: string, phase: Phase, tz?: string): { text: string; aria: string } {
  const hm = clockHM(nowIso, tz);
  return { text: `${hm} · ${PHASE_WORD[phase]}`, aria: `Local time ${hm}, ${PHASE_WORD[phase]}` };
}
export const studioKicker = (o: { board: string; i: number; stage: string }): string => `${o.board} · stage ${stageNo(o.i)} ${o.stage}`;
export const shortDigest = (d: string): string => `${d.slice(0, 15)}…`;
export const archivedBanner = (iso: string, tz?: string): string => `Archived ${dayMonth(iso, tz)}`;
export const restoreHint = (i: number, stage: string): string => `Returns it to ${stageNo(i)} ${stage}.`;
export const studioConflict = (c: GateConflict, who: string, tz?: string): string => gateConflictSentence(c, who, tz).replace(/^This gate was /, '');
export type QuoteKind = 'review' | 'question' | 'stopped' | 'done' | 'working';
export function quoteHeader(who: string, kind: QuoteKind): string {
  const word = { review: 'awaiting review', question: 'question pending', stopped: 'Stopped · needs you', done: 'finished it', working: 'working' }[kind];
  return `${who} · ${word}`;
}
export const tabCounts = (o: { rows: number; runs: number; links: number; comments: number; costUsd: number }): Array<{ id: 'spec' | 'log' | 'links' | 'talk' | 'cost'; label: string; count: string }> => [
  { id: 'spec', label: 'Spec', count: String(o.rows) }, { id: 'log', label: 'Log', count: String(o.runs) }, { id: 'links', label: 'Links', count: String(o.links) },
  { id: 'talk', label: 'Talk', count: String(o.comments) }, { id: 'cost', label: 'Cost', count: `$${o.costUsd.toFixed(2)}` },
];
