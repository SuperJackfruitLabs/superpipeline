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
