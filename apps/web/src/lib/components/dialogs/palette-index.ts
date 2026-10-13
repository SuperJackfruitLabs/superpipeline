// apps/web/src/lib/components/dialogs/palette-index.ts
import type { AgentSummary, BoardSummary, Stage } from '$lib/api';
import type { CardSummary } from '$lib/components/board/card-summary';
import type { IconName } from '$lib/components/parts/icons';
import { ageLabel } from '$lib/age';
import { otherThemeLabel } from '$lib/components/shell/account';
import { boardCountText } from './switcher-model';
import { soleAgent } from './who-picks-up';

export type PaletteGroup = 'Cards' | 'Boards' | 'Agents' | 'Actions' | 'Account';
const GROUPS: PaletteGroup[] = ['Cards', 'Boards', 'Agents', 'Actions', 'Account'];
export type PaletteAct =
  | { kind: 'goto'; href: string } | { kind: 'compose'; sentence?: string } | { kind: 'appearance' } | { kind: 'theme' } | { kind: 'signout' };
export interface PaletteItem {
  id: string; group: PaletteGroup; label: string; sub: string; needs: boolean; meta: string;
  icon: IconName | { agentId: string; name: string }; verb: string; act: PaletteAct;
}
export interface PaletteCtx {
  board: { id: string; name: string } | null;
  /** The current board's cards, already in groupByUrgency order. */
  cards: Pick<CardSummary, 'id' | 'title' | 'stageName' | 'lead' | 'ageHours' | 'blocked' | 'urgency'>[];
  /** Boards in switcher order. */
  boards: BoardSummary[];
  currentBoardId: string | null;
  agents: AgentSummary[];
  theme: 'light' | 'dark';
  personName: string;
}
export const AGENT_CAP = 4;

export function buildPaletteIndex(ctx: PaletteCtx): PaletteItem[] {
  const items: PaletteItem[] = [];
  const b = ctx.board;
  if (b) {
    for (const c of ctx.cards) {
      let sub = `${b.name} · ${c.stageName}`;
      if (c.lead.kind === 'stopped' && c.ageHours !== null) sub += ` · stopped ${ageLabel(c.ageHours)}`;
      if (c.blocked) sub += ' · Blocked';
      if (c.urgency === 'done') sub += ' · Done';
      items.push({ id: `card:${c.id}`, group: 'Cards', label: c.title, sub, needs: c.urgency === 'needs', meta: `#${c.id.slice(-4)}`, icon: 'card', verb: 'Open card', act: { kind: 'goto', href: `/b/${b.id}/c/${c.id}` } });
    }
  }
  for (const x of ctx.boards) {
    const here = x.id === ctx.currentBoardId;
    const sub = (here ? 'You are here · ' : '') + boardCountText(x.cardCount)
      + (x.needsYouCount > 0 ? ` · ${x.needsYouCount} need${x.needsYouCount === 1 ? 's' : ''} you` : '');
    items.push({ id: `board:${x.id}`, group: 'Boards', label: x.name, sub, needs: false, meta: '', icon: 'board', verb: 'Go to board', act: { kind: 'goto', href: `/b/${x.id}` } });
  }
  for (const a of ctx.agents) {
    items.push({ id: `agent:${a.id}`, group: 'Agents', label: a.name, sub: a.capabilities.length ? a.capabilities.join(', ') : 'no capabilities', needs: false, meta: '', icon: { agentId: a.id, name: a.name }, verb: 'Show agent', act: { kind: 'goto', href: '/workspace/agents' } });
  }
  const action = (id: string, label: string, sub: string, icon: IconName, verb: string, act: PaletteAct): PaletteItem => ({ id, group: 'Actions', label, sub, needs: false, meta: '', icon, verb, act });
  if (b) {
    items.push(
      action('act:dispatch', 'Dispatch a card', `new card on ${b.name}`, 'plus', 'Open composer', { kind: 'compose' }),
      action('act:operate', 'Operate', 'what needs you, what is running, what it cost', 'operate', 'Go', { kind: 'goto', href: `/b/${b.id}/operate` }),
      action('act:spend', 'Spend detail', 'by model, by card, and the board log', 'coin', 'Go', { kind: 'goto', href: `/b/${b.id}/operate/telemetry` }),
      action('act:settings', 'Board settings', `stages, gates and schedules for ${b.name}`, 'settings', 'Go', { kind: 'goto', href: `/b/${b.id}/settings` }),
    );
  }
  items.push(action('act:workspace', 'Workspace', 'agents, capabilities, labels and people', 'people', 'Go', { kind: 'goto', href: '/workspace' }));
  items.push(
    { id: 'acct:appearance', group: 'Account', label: 'Appearance…', sub: 'vibe, light or dark, time of day', needs: false, meta: '', icon: 'swatch', verb: 'Open', act: { kind: 'appearance' } },
    { id: 'acct:theme', group: 'Account', label: otherThemeLabel(ctx.theme), sub: 'theme', needs: false, meta: '', icon: ctx.theme === 'dark' ? 'sun' : 'moon', verb: 'Switch', act: { kind: 'theme' } },
    { id: 'acct:signout', group: 'Account', label: 'Sign out', sub: ctx.personName, needs: false, meta: '', icon: 'power', verb: 'Sign out', act: { kind: 'signout' } },
  );
  return items;
}

/**
 * The agents a person is most likely looking for, in order: those that alone own a stage on the
 * current board (stage order), then those that alone own a stage on a board with no cards yet,
 * those boards in switcher order. Pass the boards in that order.
 */
export function soleOwnerOrder(boards: Array<{ stages: Stage[] }>, agents: AgentSummary[]): string[] {
  const out: string[] = [];
  for (const b of boards) {
    for (const s of [...b.stages].sort((x, y) => x.order - y.order)) {
      const a = soleAgent(s, agents);
      if (a && !out.includes(a.id)) out.push(a.id);
    }
  }
  return out;
}

function agentTier(item: PaletteItem, q: string): number {
  const name = item.label.toLowerCase();
  if (q === '') return 3;
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  if (item.sub.toLowerCase().includes(q)) return 2;
  return 3;
}

export function filterPalette(items: PaletteItem[], q: string, soleOrder: string[]): { groups: Array<{ group: PaletteGroup; items: PaletteItem[] }>; flat: PaletteItem[]; total: number } {
  const needle = q.trim().toLowerCase();
  const hit = needle === '' ? items : items.filter((i) => `${i.label} ${i.group} ${i.sub}`.toLowerCase().includes(needle));
  const rank = (i: PaletteItem) => { const k = soleOrder.indexOf(i.id.slice('agent:'.length)); return k < 0 ? Number.MAX_SAFE_INTEGER : k; };
  const groups = GROUPS.map((group) => {
    let list = hit.filter((i) => i.group === group);
    if (group === 'Agents') {
      list = [...list].sort((a, b) => agentTier(a, needle) - agentTier(b, needle) || rank(a) - rank(b) || a.label.localeCompare(b.label)).slice(0, AGENT_CAP);
    }
    return { group, items: list };
  }).filter((g) => g.items.length > 0);
  const flat = groups.flatMap((g) => g.items);
  return { groups, flat, total: flat.length };
}

export function paletteCount(n: number, q: string, boardName: string | null): string {
  if (q.trim() === '') return boardName ? `Everything on ${boardName}, plus boards, agents and actions` : 'Everything in your workspace: boards, agents and actions';
  return `${n} match${n === 1 ? '' : 'es'} for “${q.trim()}”`;
}
export const groupCount = (k: number): string => (k === 1 ? '1 result' : `${k} results`);

/** The first hit in a label, for <mark>; `hit` is '' when there is none, so no empty mark renders (D-9). */
export function splitMark(label: string, q: string): { pre: string; hit: string; post: string } {
  const needle = q.trim().toLowerCase();
  const at = needle ? label.toLowerCase().indexOf(needle) : -1;
  if (at < 0) return { pre: label, hit: '', post: '' };
  return { pre: label.slice(0, at), hit: label.slice(at, at + needle.length), post: label.slice(at + needle.length) };
}
