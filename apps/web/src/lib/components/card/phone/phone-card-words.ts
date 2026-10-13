// apps/web/src/lib/components/card/phone/phone-card-words.ts
/**
 * Words for the four phone cards (card digests §6, 05-amendments §7–§8). Pure: every string a phone
 * layout prints that is not the agent's own text. Agent text is sentence-cased here, never rewritten.
 */
import { greeting, type Mood, type Phase } from '@superjackfruit/vibekit';
import type { AgentSummary, Attempt, Activity, Member, Stage } from '$lib/api';
import { isControlRow, isNarrative, visibleActivities } from '$lib/activity-groups';
import type { LeadKind } from '$lib/components/card/card-lead';
import type { CardModel } from '$lib/components/card/card-model.svelte';
import { normalisePlan, type PlanStep } from '$lib/components/card/plan';
import { referenceSource } from '$lib/components/card/references';
import { specGroups } from '$lib/components/card/spec-groups';
import type { LinkGroups, RemoveArgs } from '$lib/components/link-groups';
import { PAPER_LIGHT as PAPER_PHASE } from '$lib/components/card/paper-words';
import { ageWords as ageWordsOf } from '$lib/age';
import { displayPrincipal } from '$lib/names';
import { clockHM, dayMonth } from '$lib/when';
import { plural, sentenceCase } from '$lib/words';

/** An agent the workspace does not list reads "an agent", never its id. */
const displayAgent = (id: string | null | undefined, agents: AgentSummary[]): string => (id ? agents.find((a) => a.id === id)?.name?.trim() || 'an agent' : '');
export const STOP_COPY = 'Blocked. Waiting on you; the reason is shown at the top of this card.';
export const RESUME_PLACEHOLDER = 'For example: what you checked, and what the agent should look at next.';
const usd = (n: number): string => `$${n.toFixed(2)}`;
export const usdShort = (n: number): string => (Number.isInteger(n) ? `$${n}` : usd(n));
export const triesWord = (n: number): string => `${n} ${n === 1 ? 'try' : 'tries'}`;
const later = (stages: Pick<Stage, 'name'>[], i: number) => stages.slice(i + 1).map((s) => s.name);

export function stripWord(kind: LeadKind): string {
  if (kind === 'stopped' || kind === 'failed' || kind === 'budget') return 'stopped';
  if (kind === 'review') return 'awaiting review';
  if (kind === 'question') return 'question pending';
  if (kind === 'working') return 'working';
  if (kind === 'done') return 'done';
  return 'queued';
}
export function trackAria(stages: Pick<Stage, 'name'>[], i: number, kind: LeadKind, o: { archived?: boolean; here?: boolean } = {}): string {
  const name = stages[i]?.name ?? '';
  if (o.archived) return `Stopped at stage ${i + 1} of ${stages.length}, ${name}, archived`;
  return `Stage ${i + 1} of ${stages.length}, ${name}, ${stripWord(kind)}${o.here === false ? '' : ' here'}`;
}
/** The Studio track's label: every stage by number and name, with its state ("1 Reported, done; 2 Reproduce, stopped here; 3 Failing test"). */
export function trackStagesLabel(stages: Pick<Stage, 'name'>[], i: number, kind: LeadKind, archived = false): string {
  return stages
    .map((s, k) => `${k + 1} ${s.name}${k < i ? ', done' : k === i ? `, ${archived ? 'where it stopped, archived' : `${stripWord(kind)} here`}` : ''}`)
    .join('; ');
}
export function daylightCaption(stages: Pick<Stage, 'name'>[], i: number, kind: LeadKind, archived: boolean): { lead: string; bold: string; tail: string } {
  const name = stages[i]?.name ?? '';
  const next = later(stages, i);
  return { lead: `Stage ${i + 1} of ${stages.length} · `, bold: archived ? `${name}, where it stopped` : `${name}, ${stripWord(kind)} here`, tail: next.length ? ` · next: ${next.join(', ')}` : '' };
}
export function paperCaption(stages: Pick<Stage, 'name'>[], i: number, needsYou: boolean): string {
  const next = later(stages, i)[0];
  return `Stage ${i + 1} of ${stages.length} · ${stages[i]?.name ?? ''}${needsYou ? ', where it stopped' : ', now'}${next ? ` · then ${next}` : ''}`;
}
export function studioCaption(stages: Pick<Stage, 'name'>[], i: number, kind: LeadKind): { bold: string; tail: string } {
  const next = later(stages, i)[0];
  return { bold: `${stages[i]?.name ?? ''} · ${stripWord(kind)} here`, tail: next ? ` · next ${next}` : '' };
}
export function dockHeading(kind: LeadKind, attempts: number): { title: string; small: string } {
  const title = kind === 'failed' ? 'Failed, waiting on you' : kind === 'budget' ? 'Over budget, waiting on you' : kind === 'stopped' ? 'Stopped, waiting on you' : 'Waiting on you';
  return { title, small: `${triesWord(attempts)} so far` };
}
export function resumeOptions(targets: { key: string; n: number; name: string; current: boolean; allowed: boolean }[]) {
  return targets.map((t) => ({ value: t.key, label: `${t.n} · ${t.name}${t.current ? ' (where it stopped)' : ''}`, disabled: !t.allowed }));
}

// ── runs ──────────────────────────────────────────────────────────────────────────────────────────
type AttemptWordInput = Pick<Attempt, 'status' | 'outcome'> & { completion?: { ok?: boolean } | null };
export function attemptWord(a: AttemptWordInput, latest: boolean, leadKind: LeadKind): string {
  if ((a.outcome === 'completed' && a.completion?.ok === false) || a.outcome === 'sent_back') return 'Sent back';
  if (latest && leadKind === 'stopped') return 'Stopped';
  if (a.outcome === 'blocked' || a.status === 'blocked' || a.status === 'input-required') return 'Stopped';
  if (a.outcome === 'failed' || a.status === 'failed') return 'Failed';
  if (a.outcome === 'completed') return 'Done';
  return 'Running';
}
export function attemptReason(a: Pick<Attempt, 'failureReason'>, word: string): string {
  if (a.failureReason) return `${word}: ${a.failureReason}`;
  return word === 'Stopped' ? 'Stopped: waiting on you' : word;
}
// Formatters are built per call, not at module load: a formatter fixes the viewer's time zone when it is
// constructed, and tests (and the harness) set the zone after imports have run.
const fmt = (locale: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o);
const dayKey = (iso: string): string => fmt('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
export const dayShort = (iso: string): string => fmt('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso)).replace(',', '');
export const studioWhen = (iso: string): string => `${fmt('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(iso)).replace(',', '')} ${clockHM(iso)}`;
const TYPE_WORD: Record<string, string> = { action: 'Did', response: 'Said', thought: 'Thought', prompt: 'You said', elicitation: 'Asked' };
const TYPE_WORD_STUDIO: Record<string, string> = { action: 'Action', response: 'Response', thought: 'Thought', prompt: 'You', elicitation: 'Question' };
export type EventRow = { key: number; verb: string; body: string; time: string; stop: boolean; parameter: unknown; result: unknown };
export function eventRows(rows: Activity[], leadSentence: string | null, showToolCalls: boolean, form: 'plain' | 'studio' = 'plain'): EventRow[] {
  const { rows: shown } = visibleActivities(rows, isNarrative, showToolCalls, isControlRow);
  const words = form === 'studio' ? TYPE_WORD_STUDIO : TYPE_WORD;
  let prevDay: string | null = null;
  return shown.map((a, i) => {
    const day = dayKey(a.ts);
    const time = i === 0 || day !== prevDay ? dayShort(a.ts) : clockHM(a.ts);
    prevDay = day;
    const stop = a.signal === 'stop' || a.type === 'error';
    const body = leadSentence && a.body?.trim() === leadSentence.trim() ? STOP_COPY : (a.body ?? '');
    return { key: a.seq, verb: stop ? 'Stopped' : (a.action ?? words[a.type] ?? a.type), body, time, stop, parameter: a.parameter ?? null, result: a.result ?? null };
  });
}

// ── details ───────────────────────────────────────────────────────────────────────────────────────
export type DetailValue =
  | { kind: 'text'; shown: string; more: string | null }
  | { kind: 'evidence'; text: string }
  | { kind: 'matrix'; id: string; card: string }
  | { kind: 'repo'; text: string; href: string }
  | { kind: 'raw'; text: string };
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
/** The first-paragraph rule (coordinator): a value stored as `shown\n\ncontinuation` shows `shown` and offers "Show more". */
export function detailValue(v: unknown, criteria: string[] | null, heading: string): DetailValue {
  if (typeof v === 'string') {
    const i = v.indexOf('\n\n');
    return i < 0 ? { kind: 'text', shown: v, more: null } : { kind: 'text', shown: v.slice(0, i), more: v.slice(i + 2) };
  }
  if (Array.isArray(v) && criteria && v.length === criteria.length && v.every((x, i) => x === criteria[i])) {
    return { kind: 'evidence', text: `${v.length} items, listed under ${heading}.` };
  }
  if (isObj(v) && typeof v.matrixId === 'string' && typeof v.card === 'string') return { kind: 'matrix', id: v.matrixId, card: v.card };
  if (isObj(v) && typeof v.repo === 'string' && typeof v.visibility === 'string' && typeof v.policyUrl === 'string') {
    return { kind: 'repo', text: `${v.repo} · ${v.visibility} · `, href: v.policyUrl };
  }
  if (Array.isArray(v)) return { kind: 'raw', text: v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(', ') };
  return { kind: 'raw', text: isObj(v) ? JSON.stringify(v) : String(v) };
}
const SHORT_HEADING: Record<string, string> = { 'Who it is about': 'who' };
export const studioDetailsSummary = (labels: string[], rows: number): string =>
  `${plural(rows, 'field', 'fields')} · ${labels.map((l) => SHORT_HEADING[l] ?? l.toLowerCase()).join(', ')}`;

// ── links ─────────────────────────────────────────────────────────────────────────────────────────
export type LinkRow = { key: string; label: string; title: string; href: string; remove: RemoveArgs };
export function linkRows(g: LinkGroups, boardId: string): LinkRow[] {
  const row = (group: string, label: string, r: { cardId: string; title: string; remove: RemoveArgs }, board = boardId): LinkRow =>
    ({ key: `${group}:${r.cardId}`, label, title: r.title, href: `/b/${board}/c/${r.cardId}`, remove: r.remove });
  return [
    ...g.blockedBy.map((r) => row('blockedBy', 'Blocked by', r)),
    ...g.resolvedBlockedBy.map((r) => row('resolvedBlockedBy', 'Was blocked by', r)),
    ...g.blocks.map((r) => row('blocks', 'Blocks', r)),
    ...g.relates.map((r) => row('relates', 'Relates to', r)),
    ...g.supersedes.map((r) => row('supersedes', r.direction === 'supersedes' ? 'Supersedes' : 'Superseded by', r)),
    ...g.advisory.map((r) => row('advisory', `${r.relation === 'blocked-by' ? 'Blocked by' : r.relation === 'blocks' ? 'Blocks' : 'Relates to'} · advisory`, r, r.boardId)),
  ];
}

// ── the view every phone layout reads ───────────────────────────────────────────────────────────────
export type PhoneCardInput = Pick<
  CardModel,
  | 'card' | 'lead' | 'provenance' | 'boardId' | 'stages' | 'stageIndex' | 'stageName' | 'agent' | 'delegate' | 'attempts' | 'activityGroups'
  | 'estimate' | 'projectName' | 'milestoneName' | 'acceptanceCriteria' | 'labels' | 'ageHours' | 'counts' | 'handoff' | 'archived'
  | 'related' | 'refs' | 'linkGroups' | 'decidedGates' | 'showToolCalls' | 'comments'
>;
export interface PhoneCardCtx { members: Member[]; agents: AgentSummary[]; cardCap: number | null; nowMs: number }

export function phoneCardView(m: PhoneCardInput, ctx: PhoneCardCtx) {
  const c = m.card!;
  const lead = m.lead!;
  const lastAttempt = m.attempts.at(-1) ?? null;
  const lastAgent = lastAttempt ? { id: lastAttempt.agentId, name: displayAgent(lastAttempt.agentId, ctx.agents) } : null;
  const ownerName = displayPrincipal(c.ownerUserId, ctx.members, ctx.agents);
  const grantOwnerName = c.queuedGrantOwner ? displayPrincipal(c.queuedGrantOwner, ctx.members, ctx.agents) : null;
  const p = m.provenance;
  const queuer = p?.known ? { id: p.agent?.id ?? p.queuedByName, name: p.byAgent && !p.agent ? 'an agent' : p.queuedByName, byAgent: p.byAgent } : null;
  const grantSize = c.queuedGrant?.length ?? 0;
  const kind = lead.kind;
  const stageOf = (key: string | null) => m.stages.find((s) => s.key === key)?.name ?? key ?? '';
  const attemptNo = new Map(m.attempts.map((a, i) => [a.runId, i + 1]));
  const wordOf = (a: Attempt) => attemptWord(a, a === lastAttempt, kind);
  const runs = [...m.activityGroups].reverse().map((g, i) => {
    const a = m.attempts.find((x) => x.runId === g.runId);
    const n = attemptNo.get(g.runId) ?? m.activityGroups.indexOf(g) + 1;
    const agentName = displayAgent(g.agentId ?? a?.agentId ?? null, ctx.agents);
    return {
      key: g.runId, title: `Run ${n} · ${stageOf(g.stageKey)}`, meta: `${agentName} · ${a ? wordOf(a) : 'Running'} · attempt ${n}`, open: i === 0,
      rows: eventRows(g.activities, lead.sentence, m.showToolCalls),
    };
  });
  const plan: PlanStep[] | null = normalisePlan(c.spec?.plan);
  const groups = specGroups(c.spec ?? null, { criteriaHeading: 'Things to prove' }).map((g) => ({ label: g.label, rows: g.rows.map((r) => ({ key: r.key, label: r.label, value: (c.spec as Record<string, unknown>)[r.key] })) }));
  const i = m.stageIndex;
  const prev = i > 0 ? m.stages[i - 1].name : null;
  const handoffSummary = m.handoff && typeof m.handoff.summary === 'string' ? m.handoff.summary : m.handoff ? String(Object.values(m.handoff).find((v) => typeof v === 'string') ?? '') : null;
  const needsCap = ctx.cardCap && ctx.cardCap > 0 ? `card cap ${usd(ctx.cardCap)}` : 'no card cap set';
  const est = m.estimate?.estimatedUsd ?? null;
  return {
    ownerName, grantOwnerName, queuer, lastAgent,
    grantLine: queuer && grantOwnerName ? `Queued by ${queuer.name} on ${grantOwnerName}'s grant · ${grantSize} agents may be dispatched.` : null,
    grantTitle: grantOwnerName ? `Queued on ${grantOwnerName}'s grant` : null,
    speaker: m.agent.name || lastAgent?.name || 'the agent',
    live: !m.archived && lead.needsYou && (kind === 'stopped' || kind === 'failed' || kind === 'budget'),
    stateWord: m.archived ? 'Archived' : lead.needsYou ? 'Waiting on you' : kind === 'working' ? 'Working' : kind === 'done' ? 'Done' : 'Queued',
    claim: m.delegate.id ? `${m.delegate.name} · working it` : 'Unclaimed',
    priorityWord: c.priority > 0 ? `P${c.priority}` : 'none',
    dueWord: c.dueAt ? dayMonth(c.dueAt) : null,
    labelsWord: m.labels.length ? m.labels.map((l) => l.name).join(', ') : null,
    ageWords: ageWordsOf(m.ageHours ?? 0),
    runs,
    attemptRows: m.attempts.map((a, k) => ({
      n: k + 1, agentId: a.agentId, agentName: displayAgent(a.agentId, ctx.agents), usd: usd(a.costUsd),
      mood: (a === lastAttempt && lead.needsYou && !m.archived ? 'needs' : 'resting') as Mood, text: attemptReason(a, wordOf(a)),
    })),
    cost: { amount: usd(c.costUsd), rest: ` spent · ${est ? `of ${usd(est)}` : 'no estimate'} · ${needsCap}` },
    subtasks: { count: `${m.counts.openChildren}/${m.counts.children}`, line: `${m.counts.openChildren} of ${m.counts.children} open.${m.counts.children === 0 ? ' No sub-tasks yet.' : ''}` },
    project: m.projectName
      ? { summary: m.projectName.split(' — ').at(-1) ?? m.projectName, line: `${m.projectName} · ${m.milestoneName ?? 'no milestone'}` }
      : { summary: 'none', line: null },
    handoff: {
      summary: prev ? `from ${prev}` : 'none',
      text: handoffSummary
        ? `“${handoffSummary}”`
        : prev && queuer ? `From ${prev}: queued by ${queuer.name} on ${dayMonth(c.createdAt)} with the brief above. No earlier stage output.` : 'No handoff yet.',
    },
    plan, planSummary: plan?.length ? `${plan.filter((s) => s.done).length}/${plan.length}` : 'none yet',
    groups, fieldsCount: groups.reduce((n, g) => n + g.rows.length, 0),
    refs: m.refs.map((r) => ({ id: r.id, href: r.url, title: r.title ?? r.url, subtitle: r.subtitle ?? null, source: referenceSource(r) })),
    links: linkRows(m.linkGroups, m.boardId ?? ''),
    related: m.related.items.length,
    decisions: m.decidedGates.length,
    comments: m.comments.comments.filter((x) => !x.deletedAt).length,
  };
}
export type PhoneCardView = ReturnType<typeof phoneCardView>;

// ── Paper ─────────────────────────────────────────────────────────────────────────────────────────
export const paperDay = (now: Date, phase: Phase): string => `${fmt('en-GB', { weekday: 'long' }).format(now)}, ${PAPER_PHASE[phase]}`;
export function paperEye(needsYou: boolean, archivedAt: string | null): string | null {
  if (archivedAt) return `Archived on ${fmt('en-GB', { day: 'numeric', month: 'long' }).format(new Date(archivedAt))}`;
  return needsYou ? 'A letter that needs a reply' : null;
}
export function paperScFacts(v: PhoneCardView, m: Pick<CardModel, 'stageName' | 'card' | 'delegate'>): string[] {
  return [
    v.stateWord,
    v.priorityWord === 'none' ? 'no priority' : v.priorityWord,
    v.dueWord ? `due ${v.dueWord}` : 'no due date',
    v.labelsWord ?? 'no labels',
    `in ${m.stageName} ${v.ageWords}`,
    m.card!.attemptCount > 1 ? `attempt ${m.card!.attemptCount}` : null,
    `owner ${v.ownerName}`,
    v.queuer ? `asked by ${v.queuer.name}` : null,
    m.delegate.id ? `${m.delegate.name} working it` : 'unclaimed',
  ].filter((x): x is string => !!x);
}
export function paperEnclosures(v: PhoneCardView, m: Pick<CardModel, 'counts' | 'card'>) {
  const k = m.counts;
  return {
    brief: `${plural(k.criteria, 'thing', 'things')} to prove · ${plural(v.fieldsCount, 'detail', 'details')} · ${v.project.line ? 'project' : 'no project'}`,
    happened: `${plural(k.runs, 'run', 'runs')} · ${plural(k.attempts, 'attempt', 'attempts')} · ${v.decisions ? plural(v.decisions, 'decision', 'decisions') : 'no decisions'} · ${v.cost.amount}`,
    waiting: `${k.links ? plural(k.links, 'link', 'links') : 'no links'} · ${k.children ? `${k.openChildren} of ${k.children} sub-tasks open` : 'no sub-tasks'}`,
    attached: `${plural(k.refs, 'reference', 'references')} · ${v.related ? `${v.related} related` : 'no related prior work'}`,
    correspondence: v.comments ? plural(v.comments, 'comment', 'comments') : 'no comments yet',
  };
}

// ── Quiet ─────────────────────────────────────────────────────────────────────────────────────────
const LEAD_VERB: Partial<Record<LeadKind, string>> = { stopped: 'Stopped', failed: 'Failed', budget: 'Stopped at the budget', review: 'Waiting for review', question: 'Asked a question' };
export const quietLead = (kind: LeadKind, attempts: number): string => `${LEAD_VERB[kind] ?? 'Waiting'}. Waiting for you. ${triesWord(attempts)} so far.`;
export function quietMetaTail(kind: LeadKind, ageWords: string): string {
  if (kind === 'stopped' || kind === 'failed' || kind === 'budget') return `${kind === 'failed' ? 'Failed' : 'Stopped'} ${ageWords} ago`;
  if (kind === 'working') return 'Working';
  if (kind === 'done') return 'Done';
  if (kind === 'review') return 'Waiting for your review';
  if (kind === 'question') return 'Asked a question';
  return 'Queued';
}
export function quietState(kind: LeadKind, needsYou: boolean, archived: boolean): string {
  const live = needsYou
    ? kind === 'review' ? 'Waiting for your review' : kind === 'question' ? 'Waiting for your answer' : `${kind === 'failed' ? 'Failed' : 'Stopped'}, waiting on you`
    : kind === 'working' ? 'Working' : kind === 'done' ? 'Done' : 'Queued';
  return archived ? `Archived (was ${live.toLowerCase()})` : live;
}
export const quietAgent = (delegate: string | null, last: string | null): string => (delegate ? `${delegate}, working it.` : last ? `${last} (last run). Unclaimed.` : 'Unclaimed.');
export const quietAskedBy = (q: string, grantOwner: string | null): string => (grantOwner ? `${q}, on ${grantOwner}'s grant` : q);
export const quietInStage = (stage: string, ageWords: string, attempts: number): string => `${stage} for ${ageWords}${attempts > 0 ? `, attempt ${attempts}` : ''}`;
export const quietStages = (stages: Pick<Stage, 'name'>[], i: number): string =>
  stages.map((s, k) => `${k + 1} ${s.name}${k < i ? ' (done)' : k === i ? ' (here)' : ''}`).join(', ');

// ── Studio ────────────────────────────────────────────────────────────────────────────────────────
/** Display-only code spans (G-3, the verified regex); the text is never altered. */
const TOKEN = /\b(?:acps|evt|run|card|brd|agt)_[\w-]+|\b[a-z][\w-]*(?:\/[\w-]+)*\/[a-z][\w-]*\b|\b[a-z]+(?:_[a-z]+)+\b/g;
export function codeTokens(text: string): Array<{ text: string; code: boolean }> {
  const out: Array<{ text: string; code: boolean }> = [];
  let at = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > at) out.push({ text: text.slice(at, m.index), code: false });
    out.push({ text: m[0], code: true });
    at = m.index! + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at), code: false });
  return out;
}
export function studioClock(iso: string, phase: Phase): { text: string; aria: string } {
  const word = greeting(phase, 'studio').toLowerCase().replace(/[.!]$/, '');
  return { text: `${clockHM(iso)} · ${word}`, aria: `${clockHM(iso)}, ${word}` };
}
export function studioFigs(c: { stageIndex: number; stageCount: number; attempts: number; kind: LeadKind; ageHours: number | null; cost: number; estimateUsd: number | null; blocks: number; openSub: number; totalSub: number }) {
  const h = c.ageHours ?? 0;
  const days = Math.floor(h / 24);
  const age = h >= 48 ? { value: String(days), small: days === 1 ? 'day' : 'days' } : { value: String(Math.floor(h)), small: 'h' };
  const stopped = c.kind === 'stopped' || c.kind === 'failed' || c.kind === 'budget';
  return [
    { dt: 'Stage', value: String(c.stageIndex + 1), small: `/${c.stageCount}`, z: false },
    { dt: 'Tries', value: String(c.attempts), z: c.attempts === 0 },
    { dt: stopped ? 'Stopped for' : 'In stage for', ...age, z: false },
    { dt: c.estimateUsd ? `Cost · of ${usd(c.estimateUsd)}` : 'Cost · no est.', value: usd(c.cost), z: c.cost === 0 },
    { dt: 'Blocks', value: String(c.blocks), z: c.blocks === 0 },
    { dt: 'Sub-tasks', value: String(c.openSub), small: `/${c.totalSub}`, z: c.totalSub === 0 },
  ] as Array<{ dt: string; value: string; small?: string; z: boolean }>;
}

/** A brief field that is a document of its own (not one of the shapes detailValue words): Details opens to show it. */
export function hasStructuredDetail(groups: Array<{ rows: Array<{ value: unknown }> }>, criteria: string[] | null): boolean {
  return groups.some((g) => g.rows.some((r) => {
    const v = r.value;
    if (v === null || typeof v !== 'object') return false;
    const k = detailValue(v, criteria, '').kind;
    return k === 'raw' && (!Array.isArray(v) || v.some((x) => typeof x !== 'string'));
  }));
}
