// apps/web/src/lib/components/settings/settings-words.ts
import type { AgentSummary, BoardSnapshot, Card, Stage } from '$lib/api';
import { displayAgent } from '$lib/names';

export type WorksBy = 'person' | 'agent';
export function worksBy(s: Stage): WorksBy {
  if (s.ownerKind === 'human') return 'person';
  if (s.ownerKind === 'agent' || s.ownerKind === 'capability') return 'agent';
  return s.owner || s.requires ? 'agent' : 'person';
}

export function ownerText(s: Stage): string {
  if (s.requires) return [...(s.requires.all ?? s.requires.any ?? [])].join(', ');
  return s.owner ?? '';
}

export function ownerLabel(s: Stage, agents: AgentSummary[]): string {
  if (worksBy(s) === 'person') return 'A person';
  if (s.ownerKind === 'agent') return `Agent ${displayAgent(s.owner ?? '', agents)}`;
  const parts = s.requires?.any ?? s.requires?.all ?? (s.owner ? [s.owner] : []);
  if (parts.length === 0) return 'Agent with no capability set';
  return `Agent with ${parts.join(s.requires?.any ? ' or ' : ' and ')}`;
}

export function ago(at: number, now: number): string {
  const m = Math.floor((now - at) / 60_000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`;
}

export function cardsPerStage(cards: Pick<Card, 'currentStageKey' | 'archivedAt'>[]): Record<string, number> {
  return cards.filter((c) => !c.archivedAt).reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.currentStageKey]: (acc[c.currentStageKey] ?? 0) + 1 }), {});
}
export const stageCards = (n: number) => `${n} ${n === 1 ? 'card' : 'cards'}`;
export const cardsHere = (n: number) => `${stageCards(n)} here`;
export const wipLine = (limit: number | null | undefined) => (limit ? `WIP limit ${limit}` : 'no WIP limit');
export const ruleLine = (s: Stage) => (s.instructions?.trim() ? `Rule: ${s.instructions.trim().replace(/\s+/g, ' ')}` : 'No standing rule');
export const pipelineMeta = (n: number) => `${n} stages a card moves through, in order. Open a stage to edit it.`;

/** What "Save pipeline" sends; a stage's standing rule saves on its own and is not counted. */
export const STAGE_FIELDS = ['name', 'ownerKind', 'owner', 'requires', 'gate', 'wipLimit'] as const;
const norm = (s: Stage) => JSON.stringify(STAGE_FIELDS.map((f) => s[f] ?? null));

export function unsavedCount(draft: Stage[], saved: Stage[]): number {
  const byKey = new Map(saved.map((s) => [s.key, s]));
  const keys = new Set(draft.map((s) => s.key));
  let n = 0;
  for (const s of draft) { const o = byKey.get(s.key); if (!o || norm(o) !== norm(s)) n++; }
  for (const k of byKey.keys()) if (!keys.has(k)) n++;
  const sameKeys = draft.filter((s) => byKey.has(s.key)).map((s) => s.key);
  const savedOrder = saved.filter((s) => keys.has(s.key)).map((s) => s.key);
  if (sameKeys.join() !== savedOrder.join()) n++;
  return n;
}
export const saveState = (n: number) => (n === 0 ? 'Saved' : `${n} unsaved ${n === 1 ? 'change' : 'changes'}`);

export function ghState(g: BoardSnapshot['github']): { text: string; saved: boolean } {
  if (!g.webhookConfigured) return { text: 'Not set up', saved: false };
  return g.issueTrigger ? { text: 'Opening cards from issues', saved: true } : { text: 'Connected · trigger off', saved: false };
}
export function grantNote(n: number | null): string {
  return n === null
    ? 'Saving carries your dispatch authority onto every card this trigger opens. Without it, no agent can claim those cards.'
    : `Cards from this trigger may be dispatched to ${n} ${n === 1 ? 'agent' : 'agents'}. Save again to refresh that.`;
}

// ---- The Settings composition (composition contract, Settings): tabs, labels, connections, caps ----

/** The account Settings tabs, in page order; the hash (`/settings#labels`) picks one. */
export type SettingsTab = 'labels' | 'connections' | 'appearance' | 'account';
export const SETTINGS_TABS: readonly { id: SettingsTab; label: string }[] = [
  { id: 'labels', label: 'Labels' }, { id: 'connections', label: 'Connections' }, { id: 'appearance', label: 'Appearance' }, { id: 'account', label: 'Account' },
];
/** Board settings' tabs, in page order; the hash picks one too. */
export type BoardSettingsTab = 'stages' | 'schedules' | 'labels' | 'caps' | 'github' | 'board';
export const BOARD_SETTINGS_TABS: readonly { id: BoardSettingsTab; label: string }[] = [
  { id: 'stages', label: 'Stages' }, { id: 'schedules', label: 'Schedules' }, { id: 'labels', label: 'Labels' },
  { id: 'caps', label: 'Spending caps' }, { id: 'github', label: 'GitHub' }, { id: 'board', label: 'Name and profiles' },
];
/** The tab a URL hash names, or the first. */
export function tabFromHash<T extends string>(hash: string, tabs: readonly { id: T }[]): T {
  const h = hash.replace(/^#/, '');
  return tabs.find((t) => t.id === h)?.id ?? tabs[0].id;
}

export const BOARD_SETTINGS_LEDE = 'How this board works: its stages, schedules, labels, spending caps and GitHub. Each section saves on its own.';

/** How many live cards carry each label, by label id (a card's `labels` are ids): "used on N cards". */
export function labelUse(cards: Pick<Card, 'labels' | 'archivedAt'>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of cards) if (!c.archivedAt) for (const id of c.labels ?? []) out[id] = (out[id] ?? 0) + 1;
  return out;
}
export const usedOn = (n: number) => `${n} ${n === 1 ? 'card' : 'cards'}`;
/** A label's origin in words: someone named it ("you"), or a card created it ("inferred"). */
export const labelOrigin = (o: 'declared' | 'inferred') => (o === 'inferred' ? 'inferred' : 'you');
/** The labels section's line under its header: what the list is, and where the use counts come from. */
export function labelsMeta(scope: 'workspace' | 'board', boardName: string | null): string {
  if (scope === 'board') return 'The labels this board’s cards carry. A rename or removal reaches every board.';
  return boardName ? `Shared by every board. Use counts are for ${boardName}, the board you have open.` : 'Shared by every board. Open a board to count where each is used.';
}
/** Rows a labels table shows before "Show N more". */
export const LABELS_PAGE = 6;
export const showMore = (n: number) => `Show ${n} more`;

/** A spending cap in words. */
export const capWords = (usd: number | null | undefined) => (usd === null || usd === undefined ? 'No cap' : `$${usd.toFixed(2)}`);
