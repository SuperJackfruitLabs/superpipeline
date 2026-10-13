// apps/web/src/lib/components/operate/spend-format.ts
import type { BoardEvent, Stage } from '$lib/api';
import { lcFirst } from '$lib/words';

export const usd = (n: number) => `$${n.toFixed(2)}`;
export const pctOf = (a: number, max: number) => (max > 0 ? Math.round((a / max) * 100) : 0);

export type CountUnit = '' | 'k' | 'M';
export const unitFor = (n: number): CountUnit => (n < 1000 ? '' : n < 1_000_000 ? 'k' : 'M');
export function compactCount(n: number, unit: CountUnit = unitFor(n)): string {
  if (unit === '') return String(n);
  return unit === 'k' ? `${(n / 1e3).toFixed(1)}k` : `${(n / 1e6).toFixed(1)}M`;
}
/** The in/out pair uses the unit chosen for the total, so 1.9M splits into 1.6M and 0.3M. */
export function tokenPair(input: number, output: number): string {
  const u = unitFor(input + output);
  return `${compactCount(input, u)} in · ${compactCount(output, u)} out`;
}
export const cardsWithSpend = (n: number) => `${n} ${n === 1 ? 'card' : 'cards'} with spend in this window`;
export const avgPerCard = (total: number, cards: number) => (cards > 0 ? usd(total / cards) : '—');

/** Daylight/Paper/Quiet bar: 170px for the busiest day, 2px floor (a zero day still draws a line). */
export const barHeight = (cost: number, max: number) => (cost === 0 || max === 0 ? 2 : Math.max(2, Math.round((cost / max) * 170)));
/** Studio bar: 160px column, nothing drawn for a zero day. */
export const barHeightStudio = (cost: number, max: number) => (cost === 0 || max === 0 ? 0 : Math.max(2, Math.round((cost / max) * 160)));

/** The seven UTC dates ending today (YYYY-MM-DD), oldest first. */
export function last7Days(nowMs: number): string[] {
  const d = new Date(nowMs);
  return Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - (6 - i))).toISOString().slice(0, 10));
}
export function zeroFill(byDay: Array<{ day: string; costUsd: number }>, days: string[]): Array<{ day: string; costUsd: number }> {
  return days.map((day) => ({ day, costUsd: byDay.find((b) => b.day === day)?.costUsd ?? 0 }));
}
const utc = (day: string) => new Date(`${day}T00:00:00Z`);
export const dayLabel = (day: string) => `${utc(day).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })} ${utc(day).getUTCDate()}`;
export function dayRange(days: string[]): string {
  const [a, b] = [utc(days[0]!), utc(days[days.length - 1]!)];
  const wd = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
  const mo = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
  const first = `${wd(a)} ${a.getUTCDate()}${mo(a) === mo(b) ? '' : ` ${mo(a)}`}`;
  return `${first} to ${wd(b)} ${b.getUTCDate()} ${mo(b)}`;
}
/** Index of the busiest day (ties: the latest), or -1 when nothing was spent. */
export function busiestIndex(days: Array<{ costUsd: number }>): number {
  let best = -1;
  days.forEach((d, i) => { if (d.costUsd > 0 && (best === -1 || d.costUsd >= days[best]!.costUsd)) best = i; });
  return best;
}
export function busiestLine(days: Array<{ day: string; costUsd: number }>): string {
  const i = busiestIndex(days);
  return i === -1 ? 'No spend recorded in these 7 days.' : `Busiest: ${dayLabel(days[i]!.day)} · ${usd(days[i]!.costUsd)}`;
}
export const chartLabel = (days: Array<{ day: string; costUsd: number }>) => `Spend per day, ${days.map((d) => `${dayLabel(d.day)} ${usd(d.costUsd)}`).join(', ')}`;

export const shortId = (cardId: string) => cardId.replace(/^card_/, '').slice(0, 6);
export function shortTitle(t: string): string {
  const w = t.split(' ');
  const n = w.slice(0, 3).join(' ').length < 25 ? 4 : 3;
  return w.slice(0, n).join(' ') + (w.length > n ? '…' : '');
}

const KIND: Record<string, string> = {
  stale: 'stuck', overdue: 'overdue', failed: 'failed', blocked: 'stopped', gate: 'review needed', input: 'question asked',
  rework: 'sent back', reclaimed: 'run reclaimed', 'control-pair': 'not dispatched',
};
const FIXED: Record<string, string> = { 'cards.stale_digest': 'Stale-card digest sent', 'link.added': 'Link added', 'card.updated': 'Card updated', 'card.created': 'Card created' };

export function eventLabel(e: BoardEvent, stages: Stage[]): string {
  const p = e.payload as Record<string, unknown>;
  if (FIXED[e.type]) return FIXED[e.type]!;
  if (e.type === 'notification') {
    const body = typeof p.body === 'string' ? p.body.trim() : '';
    if (body) return `Notification: ${lcFirst(body.split(':')[0]!.trim())}`;
    const kind = String(p.kind ?? '');
    return `Notification: ${KIND[kind] ?? kind}`;
  }
  if (e.type === 'card.moved') {
    const to = String(p.to ?? '');
    return `Moved to ${stages.find((s) => s.key === to)?.name ?? to}`;
  }
  const words = e.type.replace(/[._]/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function eventSummary(e: BoardEvent): string {
  const p = e.payload as Record<string, unknown>;
  return ['cardId', 'agentId', 'to', 'from', 'name', 'reason', 'decision'].filter((k) => typeof p[k] === 'string').map((k) => `${k}=${p[k] as string}`).join(' · ');
}
export const rawLine = (e: BoardEvent) => { const s = eventSummary(e); return `${e.type}${s ? ` ${s}` : ''}`; };
export const logMeta = (n: number) => `last ${n} ${n === 1 ? 'event' : 'events'}, newest first`;

export function budgetLine(spend: number, budget: number | null, over: boolean): { text: string; setCap: boolean } {
  if (budget === null) return { text: 'No budget cap set · ', setCap: true };
  return { text: `of a ${usd(budget)} board cap · ${pctOf(spend, budget)}% used${over ? ' · over the cap' : ''}`, setCap: false };
}
export const capsStatus = (board: number | null, card: number | null) =>
  board === null && card === null ? 'No caps set' : `Board ${board === null ? 'none' : usd(board)} · card ${card === null ? 'none' : usd(card)}`;

export const CAP_HINT_INVALID = 'Enter an amount in dollars, like 25 or 12.50, or leave it empty for no cap.';
export function parseCap(v: string): number | null | 'invalid' {
  const t = v.trim();
  if (t === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return 'invalid';
  const n = Number(t);
  return n > 0 ? n : 'invalid';
}

/** Newest first; events of the same second keep the order they were written in (a digest before its notification). */
export const newestFirst = (events: BoardEvent[]): BoardEvent[] => [...events].sort((a, b) => b.ts.localeCompare(a.ts) || a.seq - b.seq);
