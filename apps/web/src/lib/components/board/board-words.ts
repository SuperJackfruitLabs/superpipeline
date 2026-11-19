// apps/web/src/lib/components/board/board-words.ts
/**
 * The boards' own words, as pure functions of the model. The same words in every vibe; the unit
 * tests hold the exact strings.
 */
import type { Mood } from '@superjackfruitlabs/vibekit-ui';
import type { BoardSnapshot, Stage } from '$lib/api';
import { numWord, plural } from '$lib/words';
import type { CardSummary, StageSummary } from './card-summary';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
const parts = (d: string) => d.slice(0, 10).split('-').map(Number) as [number, number, number];
/** '2026-10-06' → '6 Oct'. A due date is a calendar day, never shifted by a time zone. */
export const dueShort = (d: string): string => `${parts(d)[2]} ${MONTHS[parts(d)[1] - 1].slice(0, 3)}`;
/** '2026-10-06' → '6 October'. */
export const dueLong = (d: string): string => `${parts(d)[2]} ${MONTHS[parts(d)[1] - 1]}`;
/** Lives in `$lib/names` (card summaries use it, and this file reads theirs); re-exported here. */
export { personInitials } from '$lib/names';

// ── The board page ──────────────────────────────────────────────────────────────────────────────
export const moreLabelsTitle = (n: number): string => `${n} more ${n === 1 ? 'label' : 'labels'}`;

export type TileWho =
  | { kind: 'person'; name: string; initials: string; text: string; note: string }
  | { kind: 'agent'; name: string; mood: Mood; note: string }
  | { kind: 'plain'; text: string }
  | { kind: 'done'; text: string };

/** Who holds a card, and what that means for you (the first half of a tile's state line). */
export function tileWho(s: CardSummary): TileWho {
  if (s.urgency === 'done') return { kind: 'done', text: s.stageName };
  if (s.urgency === 'closed') return { kind: 'plain', text: 'Closed' };
  if (s.urgency === 'queued') return { kind: 'plain', text: s.held ? 'Unclaimed · starts when unblocked' : 'Unclaimed · waiting to be picked up' };
  if (s.urgency === 'working') {
    const a = s.delegate ?? s.lastAgent;
    return a ? { kind: 'agent', name: a.name, mood: 'working', note: '· working' } : { kind: 'plain', text: 'Working' };
  }
  const a = s.lastAgent ?? s.delegate;
  if (s.kind === 'no-owner' || !a) {
    return { kind: 'person', name: s.owner.name, initials: s.owner.initials, text: s.owner.isMe ? 'With you' : `With ${s.owner.name}`, note: s.kind === 'no-owner' ? '· no agent works this stage' : '· needs you' };
  }
  return { kind: 'agent', name: a.name, mood: 'needs', note: '· needs you' };
}

/** Who works a lane, beside its name: the last stage is where cards end, a gate is a person deciding. */
export function laneWho(st: StageSummary): string {
  if (st.terminal) return 'done';
  if (st.owner.kind === 'human') return st.gate ? 'a person decides' : 'a person works this';
  if (st.owner.kind === 'agent') return `${st.owner.label} works this`;
  const d = st.declaredBy;
  if (d.length === 0) return 'no agent declares this';
  return d.length === 1 ? `${d[0]} works this` : `${plural(d.length, 'agent', 'agents')} work this`;
}

/**
 * A folded lane's "Show N more" (rule 7): `n` is what the press shows, `wanting` how many of those want
 * you, so the two numbers agree. The fold never hides attention silently: "Show 6 more · 2 want you".
 */
export function laneMore(n: number, wanting: number): string {
  const more = `Show ${n} more`;
  return wanting > 0 ? `${more} · ${wanting} ${wanting === 1 ? 'wants' : 'want'} you` : more;
}

/** The board's one attention line: how many cards here wait on you. */
export const attentionLine = (needs: number): string =>
  needs === 0 ? 'Nothing here needs you.' : `${needs} ${needs === 1 ? 'card wants' : 'cards want'} you here.`;

// ── Empty board ─────────────────────────────────────────────────────────────────────────────────
export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/** The board's lede as HTML: only `**bold**` becomes markup; the rest is the board owner's text, escaped. */
export function emptyLedeHtml(intro: BoardSnapshot['intro'], stageCount: number): string {
  if (!intro?.lede) return escapeHtml(`This board has ${numWord(stageCount)} stages.`);
  return escapeHtml(intro.lede).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}
export const emptyHint = (intro: BoardSnapshot['intro']): string => intro?.composeHint || 'Say what you want in a sentence; an agent drafts the brief.';
export type EmptyWho =
  | { kind: 'initials'; text: string; label: string; name: string }
  | { kind: 'face'; face: string; name: string }
  | { kind: 'none'; name: string };
export function emptyWho(st: StageSummary, me: { name: string; initials: string } | null): EmptyWho {
  if (st.owner.kind === 'human') {
    if (st.gate) return { kind: 'initials', text: me?.initials ?? 'P', label: me?.name ?? 'A person', name: 'you decide' };
    return { kind: 'initials', text: 'P', label: 'A person', name: 'a person' };
  }
  if (st.owner.kind === 'agent') return { kind: 'face', face: st.owner.label, name: st.owner.label };
  const d = st.declaredBy;
  if (d.length === 0) return { kind: 'none', name: 'nobody yet' };
  return { kind: 'face', face: d[0], name: d.length === 1 ? d[0] : plural(d.length, 'agent', 'agents') };
}
export function emptyTags(st: StageSummary, def: Stage): Array<{ text: string; g: boolean }> {
  const out: Array<{ text: string; g: boolean }> = [];
  if (st.owner.kind === 'capability' && def.owner) out.push({ text: def.owner, g: false });
  if (st.gate) out.push({ text: 'Approval gate', g: true });
  if (st.wipLimit !== null) out.push({ text: `limit ${st.wipLimit}`, g: false });
  if (st.count === 0) out.push({ text: 'empty', g: false });
  return out;
}
