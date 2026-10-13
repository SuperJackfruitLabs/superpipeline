// apps/web/src/lib/components/card/card-words.ts
/** The sentences every card surface prints (shared spec §4 and 05-amendments). Pure. */
import type { Attempt, Card, GateConflict, Stage } from '$lib/api';
import { ageWords } from '$lib/age';
import { dayMonth, clockHM, whenLabel } from '$lib/when';
import type { CardLead } from './card-lead';
import { attemptWord } from './state-words';

export const usd = (n: number): string => `$${n.toFixed(2)}`;
const s = (n: number) => (n === 1 ? '' : 's');

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length === 0 ? '' : words.length === 1 ? words[0]!.charAt(0).toUpperCase() : `${words[0]!.charAt(0)}${words.at(-1)!.charAt(0)}`.toUpperCase();
}

export function unclaimedChip(i: { delegateName: string | null; lastAgentName: string | null; attemptCount: number }): string {
  if (i.delegateName) return `${i.delegateName} · working it`;
  return i.lastAgentName ? `Unclaimed · ${i.lastAgentName} ran attempt ${i.attemptCount}` : 'Unclaimed';
}
export const ownerChip = (name: string): string => `Owner · ${name}`;
export const askedByTitle = (name: string, byAgent: boolean, grantSize: number | null): string | null =>
  byAgent && (grantSize ?? 0) > 0 ? `${name}, an agent, with dispatch authority on this board` : null;

export function provenanceLine(p: { queuedByName: string; byAgent: boolean; covers: boolean | null }, delegateName: string | null): string {
  const who = `${p.byAgent ? 'an agent' : 'a person'}${p.covers ? ', allowed to dispatch the one working it' : ''}`;
  return `Asked by ${p.queuedByName} (${who}).${delegateName ? ` ${delegateName} is working it.` : ' Unclaimed now.'}`;
}
/** API-3; the count is every principal in the grant (all `prn_…`). */
export const grantLine = (queuedByName: string, ownerName: string, n: number): string =>
  `Queued by ${queuedByName} on ${ownerName}'s grant · ${n} agent${s(n)} may be dispatched.`;

export function replySub(card: Pick<Card, 'attemptCount' | 'needsHuman'>, agent: string): string {
  const reason = card.needsHuman?.reason;
  if (reason === 'not-authorised') return 'Not dispatched: nobody with permission asked for it. Say who should pick it up.';
  if (reason === 'repeated-failure') return `Failed ${card.needsHuman?.failureCount ?? card.attemptCount} times; the board stopped retrying. Tell ${agent} what to do differently.`;
  return `Stopped after ${card.attemptCount} attempt${s(card.attemptCount)}. Tell ${agent} what to do differently.`;
}

export function agentRole(i: { stageName: string; attempt: number; delegated: boolean }): string {
  return `Agent for ${i.stageName} · ran attempt ${i.attempt} · ${i.delegated ? 'working it now' : 'Unclaimed now'}`;
}
export function pageSmall(lead: Pick<CardLead, 'kind' | 'needsYou'>, agent: string): string {
  if (lead.needsYou) return `${agent} is waiting for your reply`;
  return lead.kind === 'done' ? `Finished by ${agent}` : `${agent} is working`;
}

export interface FactInput { card: Pick<Card, 'priority' | 'dueAt' | 'attemptCount'>; stageName: string; ageHours: number | null; labelNames: string[]; projectName: string | null; tz?: string }
/** The fact line under the title; the page adds Project (pass `projectName`). */
export function factItems(i: FactInput): Array<{ term: string; value: string }> {
  const out = [
    { term: 'Priority', value: i.card.priority > 0 ? `P${i.card.priority}` : 'none' },
    { term: 'Due', value: i.card.dueAt ? dayMonth(i.card.dueAt, i.tz) : 'none' },
    { term: 'Labels', value: i.labelNames.length ? i.labelNames.join(', ') : 'none' },
  ];
  if (i.ageHours !== null) out.push({ term: `In ${i.stageName} for`, value: ageWords(i.ageHours) });
  if (i.card.attemptCount > 1) out.push({ term: 'Attempt', value: String(i.card.attemptCount) });
  if (i.projectName) out.push({ term: 'Project', value: i.projectName });
  return out;
}

export function briefMeta(hasDescription: boolean, criteria: number, open: boolean): string {
  const what = [hasDescription ? 'Description' : null, criteria ? `${criteria} criteri${criteria === 1 ? 'on' : 'a'}` : null].filter(Boolean).join(' and ');
  return `${what || 'Nothing written'} · ${open ? 'Hide' : 'Show'}`;
}
export function briefSummary(rows: number, hasPlan: boolean, hasProject: boolean, surface: 'drawer' | 'page' | 'phone'): string {
  if (surface === 'page') return `${rows} details`;
  if (surface === 'phone') return `${rows} fields`;
  return `Details · ${rows} fields${hasPlan ? ', plan' : ''}${hasProject ? ', project' : ''}`;
}
export const criteriaCount = (n: number): string => `${n} acceptance criteri${n === 1 ? 'on' : 'a'}`;
export const planNone = (agent: string): string => `${agent || 'The agent'} did not post a plan for this card.`;
export const planProgress = (done: number, n: number): string => `${done} / ${n} steps · ${Math.round((100 * done) / n)}%`;
export const projectLine = (project: string, milestone: string | null): string => `${project} · ${milestone ?? 'no milestone'}`;

export const whatHappenedSummary = (runs: number, decisions: number): string =>
  `${runs} run${s(runs)} · ${decisions ? `${decisions} decision${s(decisions)}` : 'no decisions yet'}`;
export function linksSummary(c: { links: number; children: number; openChildren: number; refs: number; related: number }, surface: 'drawer' | 'page'): string {
  const parts = [
    c.links ? `${c.links} link${s(c.links)}` : surface === 'drawer' ? 'no links' : null,
    c.children ? `${c.openChildren} of ${c.children} sub-tasks open` : surface === 'drawer' ? 'no sub-tasks' : null,
    c.refs || surface === 'drawer' ? `${c.refs} reference${s(c.refs)}` : null,
    c.related ? `${c.related} related` : surface === 'drawer' ? 'no related work' : null,
  ];
  return parts.filter(Boolean).join(' · ');
}
export const subtasksLine = (open: number, n: number): string => `${open} open of ${n}`;
export const talkSummary = (n: number): string => (n ? `${n} comment${s(n)}` : 'No comments yet');
export function relatedLine(phase: 'loading' | 'ok' | 'unavailable' | 'absent', n: number): string {
  if (phase === 'unavailable') return 'Related prior work could not be loaded from Superlibrary.';
  if (phase === 'loading') return 'Looking for related prior work…';
  return n ? `${n} related piece${s(n)} of prior work in Superlibrary.` : 'No related prior work found in Superlibrary.';
}
export function costSummary(cost: number, estimate: number | null, deliveryMode: string | null): string {
  return `${usd(cost)} · ${estimate ? `est. ${usd(estimate)}` : 'no estimate'} · ${deliveryMode ? `${deliveryMode} delivery` : 'no delivery'}`;
}

/** D-8: the carried handoff in one line, or what stands in for it before the first stage output. */
export function handoffLine(i: { handoff: Record<string, unknown> | null; stageIndex: number; stages: Pick<Stage, 'name'>[]; queuedByName: string; createdAt: string | undefined; tz?: string }): string {
  const prev = i.stages[i.stageIndex - 1]?.name ?? null;
  if (i.handoff && Object.keys(i.handoff).length) {
    const first = typeof i.handoff.summary === 'string' ? i.handoff.summary : Object.values(i.handoff).find((v): v is string => typeof v === 'string') ?? '';
    return `Handoff from ${prev ?? 'the last stage'}: “${first}”`;
  }
  const when = i.createdAt ? ` on ${dayMonth(i.createdAt, i.tz)}` : '';
  if (!prev) return `Queued by ${i.queuedByName}${when} with the brief above.`;
  return `From ${prev}: queued by ${i.queuedByName}${when} with the brief above. No earlier stage output.`;
}
export const attemptsLine = (attempts: Attempt[], name: (agentId: string) => string): string =>
  `Attempts: ${attempts.map((a, i) => `${i + 1} · ${name(a.agentId)} · ${usd(a.costUsd)} · ${attemptWord(a)}`).join('; ')}`;

export const noteHint = (len: number): string => `Needed before you send. ${len} / 8000`;
export const emptyNoteError = (agent: string): string => `Add a note for ${agent || 'the agent'} first.`;
export const emptyNoteCaption = (agent: string): string => `Pressing it with no note says “Add a note for ${agent || 'the agent'} first.”`;
/** §8.2-6: never names a card's specifics. */
export const RESUME_PLACEHOLDER = 'For example: what you checked, and what the agent should look at next.';

export const archivedTitle = (archivedAt: string, tz?: string): string => `Archived ${dayMonth(archivedAt, tz)}`;
/** API-2: a review cancelled within 5 s of the archive was cancelled by it. */
export function archivedReason(archivedAt: string, gates: Array<{ status: string; resolvedAt?: string | null }>): string {
  const at = Date.parse(archivedAt);
  const byArchive = gates.some((g) => (g.status === 'cancelled' || g.status === 'canceled') && g.resolvedAt && Math.abs(Date.parse(g.resolvedAt) - at) <= 5000);
  return byArchive ? 'Its pending review was cancelled when the card was archived.' : 'It is off the board. Restore puts it back.';
}
export const restoreNote = (stageName: string): string => `Puts it back on the board at ${stageName}.`;
export const doneLine = (lastStage: string, finishedAt: string, attempts: number, now: Date, tz?: string): string =>
  `Reached ${lastStage} on ${whenLabel(finishedAt, now, tz)} · ${attempts} attempt${s(attempts)}`;

const VIA: Readonly<Record<GateConflict['via'], string>> = { matrix: 'Matrix', web: 'the web app', api: 'the API' };
/** API-1: who already decided, where, and when. The bold "Not recorded." is drawn by the layout. */
export const gateConflictSentence = (c: GateConflict, deciderName: string, tz?: string): string =>
  `This gate was already decided from ${VIA[c.via]} by ${deciderName} at ${clockHM(c.decidedAt, tz)}.`;

export const loadingNote = (agent: string): string => `Loading what ${agent || 'the agent'} said and the card’s history…`;
/** D-14: at most five bars, the wide one at the current stage (first or second). */
export function loadingBars(stages: number, stageIndex: number): number[] {
  const n = Math.min(Math.max(stages, 1), 5);
  const wide = Math.min(stageIndex, 1, n - 1);
  return Array.from({ length: n }, (_, i) => (i === wide ? 2.8 : 1));
}
