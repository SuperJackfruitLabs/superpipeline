// apps/web/src/lib/components/card/card-model.svelte.ts
/**
 * Everything a card surface knows and can do — the drawer, the standalone page and the dev
 * gallery each construct one. Moved out of CardDrawer.svelte's script (the long comments there
 * explaining each fetch and each guard move with the code they explain; keep them).
 *
 * Surface rule after a successful decision, archive or delete: drawer → `app.closeCard()`;
 * page → stay and `refresh()` (delete navigates to the board); gallery → nothing.
 */
import { untrack } from 'svelte';
import { goto } from '$app/navigation';
import { app } from '$lib/stores/app.svelte';
import {
  archiveCard, deleteCard, getAttempts, getCardActivities, getEstimate, getProject, listLinks, parseGateConflict, unarchiveCard, updateCard,
  type AgentSummary, type Attempt, type BoardSnapshot, type Card, type CardActivities, type CardLinks, type Estimate, type Gate,
  type GateConflict, type GateDecision, type Milestone, type Project, type Stage,
} from '$lib/api';
import { displayPrincipal } from '$lib/names';
import { cardProvenance } from '$lib/components/board/card-provenance';
import { overdue } from '$lib/components/board/card-due';
import { groupActivities } from '$lib/activity-groups';
import { stageAccount } from '$lib/stage-account';
import { manualDeliveryItems } from '$lib/approval-delivery';
import { isAbsent, libraryRef, relatedForCard, type RelatedLite } from '$lib/superlibrary';
import { buildLinkGroups } from '$lib/components/link-groups';
import { resolveProjectName } from '$lib/components/plan/project-lookup';
import { normalisePlan } from './plan';
import { factItems, unclaimedChip } from './card-words';
import { cardLead, moodFor, speakerOf } from './card-lead';
import { trackStatus } from './state-words';
import type { StageTrackStatus } from '@superjackfruit/vibekit';
import { QuestionAnswer } from './question/question-answer.svelte';
import { CommentsModel } from './comments-model.svelte';
import { ResumeModel } from './resume-model.svelte';
import { DeliveryControls, EditForm, LinkEditor, ProjectPicker, ReferenceComposer, SubtaskComposer } from './card-forms.svelte';
import type { CardAgent, CardCounts, GateBinding, QuestionBinding } from './layouts/types';

export type CardSurface = 'drawer' | 'page' | 'gallery';
export interface CardSource { board: BoardSnapshot; agents: AgentSummary[] }
export interface CardModelContext { boardId: string | null; cardId: string | null; surface: CardSurface }
export interface CardModelOptions { holdDetail?: boolean; source?: CardSource }
export interface RelatedState { phase: 'loading' | 'ok' | 'unavailable' | 'absent'; items: RelatedLite[] }

/** An agent the board does not list is "an agent", never its raw `agt_…` id (review focus 3). */
const agentName = (id: string | null, agents: AgentSummary[]): string => (id ? agents.find((a) => a.id === id)?.name?.trim() || 'an agent' : '');

/** A burst of feed events collapses into one refetch (see the original comment). */
const FEED_COALESCE_MS = 1000;
const COPIED_MS = 2000;

export class CardModel {
  readonly #ctx: () => CardModelContext;
  readonly #opts: CardModelOptions;
  #copiedTimer: ReturnType<typeof setTimeout> | undefined;

  // ---- fetched for this card ----
  detail = $state<CardActivities | null>(null);
  attempts = $state<Attempt[]>([]);
  estimate = $state<Estimate | null>(null);
  edges = $state<CardLinks>({ links: [], externalLinks: [] });
  projectDetail = $state<{ project: Project; milestones: Milestone[] } | null>(null);
  related = $state<RelatedState>({ phase: 'loading', items: [] });

  // ---- local UI state ----
  showToolCalls = $state(false);
  /** Which attempts the reader opened or closed (by run id); unset means the default (newest open). */
  runOpen = $state<Record<string, boolean>>({});
  /** Which attempts show their tool calls (by run id). Per attempt, so one run's toggle never moves another. */
  runTools = $state<Record<string, boolean>>({});
  localError = $state<string | null>(null);
  gateError = $state<string | null>(null);
  gateConflict = $state<GateConflict | null>(null);
  copied = $state<'id' | 'link' | 'session' | 'spec' | null>(null);
  assigning = $state(false);
  archiving = $state(false);

  readonly edit: EditForm;
  readonly project: ProjectPicker;
  readonly links: LinkEditor;
  readonly subtasks: SubtaskComposer;
  readonly refsForm: ReferenceComposer;
  readonly delivery: DeliveryControls;
  readonly comments: CommentsModel;
  readonly resume: ResumeModel;
  readonly question: QuestionAnswer;

  // ---- where it is ----
  readonly surface = $derived.by(() => this.#ctx().surface);
  readonly boardId = $derived.by(() => this.#ctx().boardId);
  readonly cardId = $derived.by(() => this.#ctx().cardId);
  readonly board = $derived.by<BoardSnapshot | null>(() => this.#opts.source?.board ?? app.board);
  readonly agents = $derived.by<AgentSummary[]>(() => this.#opts.source?.agents ?? app.agents);
  readonly card = $derived<Card | undefined>(this.cardId ? this.board?.cards.find((c) => c.id === this.cardId) : undefined);
  readonly boardName = $derived(this.board?.name ?? '');
  readonly stages = $derived<Stage[]>([...(this.board?.stages ?? [])].sort((a, b) => a.order - b.order));
  readonly stageIndex = $derived(Math.max(0, this.stages.findIndex((s) => s.key === this.card?.currentStageKey)));
  readonly stageName = $derived(this.card ? (this.stages.find((s) => s.key === this.card!.currentStageKey)?.name ?? this.card.currentStageKey) : '');
  readonly shortId = $derived(this.card ? this.card.id.slice(-4) : '');
  readonly pageHref = $derived(this.boardId && this.cardId ? `/b/${this.boardId}/c/${this.cardId}/page` : '');
  readonly boardHref = $derived(this.boardId ? `/b/${this.boardId}` : '/');
  readonly detailLoaded = $derived(this.detail !== null);
  readonly archived = $derived(!!this.card?.archivedAt);

  // ---- what is waiting ----
  /** The card's own record wins over the snapshot (see the original comment on `gate`). */
  readonly gate = $derived<Gate | undefined>(
    this.cardId
      ? (this.detail?.gates?.find((g) => g.status === 'pending') ?? (this.detail ? undefined : this.board?.gates.find((g) => g.cardId === this.cardId && g.status === 'pending')))
      : undefined,
  );
  readonly decidedGates = $derived((this.detail?.gates ?? []).filter((g) => g.status !== 'pending'));
  readonly elicitation = $derived(this.cardId ? this.board?.elicitations.find((e) => e.cardId === this.cardId && e.status === 'pending') : undefined);
  readonly deliveryGate = $derived([...this.decidedGates].reverse().find((g) => g.approvalSubject && (g.decision === 'approve_manual' || g.decision === 'approve_automatic')));
  readonly manualItems = $derived(this.deliveryGate?.decision === 'approve_manual' ? manualDeliveryItems(this.deliveryGate.approvalSubject!.canonical) : []);

  // ---- what it carries ----
  readonly refs = $derived(this.cardId ? (this.board?.references ?? []).filter((r) => r.cardId === this.cardId) : []);
  readonly libraryRefs = $derived(this.refs.flatMap((r) => { const l = libraryRef(r.url); return l ? [{ ref: r, ...l }] : []; }));
  readonly otherRefs = $derived(this.refs.filter((r) => libraryRef(r.url) === null));
  readonly children = $derived(this.card ? (this.board?.cards ?? []).filter((c) => c.parentCardId === this.card!.id) : []);
  readonly activityGroups = $derived(groupActivities(this.detail?.activities ?? [], this.attempts));
  readonly stageEntries = $derived(stageAccount(this.attempts, this.refs));
  readonly stageByRun = $derived(new Map(this.stageEntries.map((e) => [e.runId, e])));
  readonly linkGroups = $derived(
    this.card && this.boardId
      ? buildLinkGroups(this.boardId, this.card.id, this.card.blockedBy, this.edges.links, this.edges.externalLinks, (id) => this.board?.cards.find((c) => c.id === id)?.title ?? id)
      : { blockedBy: [], resolvedBlockedBy: [], blocks: [], relates: [], supersedes: [], advisory: [] },
  );
  readonly linkCount = $derived(
    this.linkGroups.blockedBy.length + this.linkGroups.resolvedBlockedBy.length + this.linkGroups.blocks.length +
      this.linkGroups.relates.length + this.linkGroups.supersedes.length + this.linkGroups.advisory.length,
  );
  readonly hasAnyLink = $derived(this.linkCount > 0);
  readonly projectName = $derived(resolveProjectName(this.card?.projectId ?? null, app.projects));
  readonly milestoneName = $derived(
    this.card?.milestoneId ? (this.projectDetail?.milestones.find((m) => m.id === this.card!.milestoneId)?.name ?? this.card.milestoneId) : null,
  );
  readonly acceptanceCriteria = $derived(Array.isArray(this.card?.spec?.acceptanceCriteria) ? (this.card!.spec!.acceptanceCriteria as string[]) : null);
  readonly plan = $derived(normalisePlan(this.card?.spec?.plan));
  readonly handoff = $derived(this.detail?.handoff ?? null);
  readonly overdue = $derived(this.card ? overdue(this.card.dueAt, this.card.state, new Date().toISOString().slice(0, 10)) : false);
  readonly labels = $derived(this.card ? this.card.labels.map((id) => ({ id, ...(app.labelById().get(id) ?? { name: id, colour: '' }) })) : []);
  readonly ageHours = $derived(this.card?.stateSince ? Math.max(0, (Date.now() - Date.parse(this.card.stateSince)) / 3_600_000) : null);
  readonly costPct = $derived(
    this.card && this.estimate?.estimatedUsd && this.estimate.estimatedUsd > 0 ? Math.min(100, Math.round((this.card.costUsd / this.estimate.estimatedUsd) * 100)) : 0,
  );

  // ---- who ----
  readonly lead = $derived(
    this.card
      ? cardLead({ card: this.card, gate: this.gate, elicitation: this.elicitation, activities: this.detail?.activities ?? [], failureReason: this.stageEntries.at(-1)?.failureReason ?? null })
      : null,
  );
  /** The card page track's status word (vibekit StageTrack `status`). */
  readonly trackStatus = $derived<StageTrackStatus>(trackStatus(this.archived ? 'archived' : (this.lead?.kind ?? 'idle')));
  /** The last run's agent; from the snapshot's `lastAgentId` until the attempts arrive (cell F). */
  readonly lastAgentId = $derived(this.attempts.at(-1)?.agentId ?? this.card?.lastAgentId ?? null);
  /** Who speaks for the card: delegate, gate producer, asker — else whoever ran it last (G-2). */
  readonly speakerId = $derived(
    speakerOf({ delegateId: this.card?.delegateAgentId ?? null, gate: this.gate, elicitation: this.elicitation }) ?? this.lastAgentId,
  );
  readonly agent = $derived<CardAgent>({
    id: this.speakerId,
    name: agentName(this.speakerId, this.agents),
    iconUrl: this.agents.find((a) => a.id === this.speakerId)?.iconUrl ?? null,
    mood: this.lead ? moodFor(this.lead.kind, !!this.speakerId) : 'resting',
  });
  readonly delegate = $derived.by<CardAgent>(() => {
    const id = this.card?.delegateAgentId ?? null;
    return { id, name: agentName(id, this.agents), iconUrl: this.agents.find((a) => a.id === id)?.iconUrl ?? null, mood: this.lead ? moodFor(this.lead.kind, !!id) : 'resting' };
  });
  readonly provenance = $derived(this.card ? cardProvenance(this.card, app.members, this.agents) : null);
  /** Who asked for it; an agent the board does not list is "an agent", not its id. */
  readonly queuedByName = $derived.by<string>(() => {
    const p = this.provenance;
    if (!p) return '';
    return p.byAgent && !p.agent ? 'an agent' : p.queuedByName;
  });
  /** The people chip; null when nobody has run or holds the card (review focus 1). */
  readonly chip = $derived.by<string | null>(() => {
    const card = this.card;
    if (!card) return null;
    const delegateName = card.delegateAgentId ? this.delegate.name : null;
    const lastAgentName = this.lastAgentId ? agentName(this.lastAgentId, this.agents) : null;
    if (!delegateName && (!lastAgentName || card.attemptCount === 0)) return null;
    return unclaimedChip({ delegateName, lastAgentName, attemptCount: card.attemptCount });
  });
  /** The fact line; `Attempt` only from the second attempt on; the page adds Project (the drawer shows it in The brief). */
  readonly facts = $derived(
    this.card ? factItems({ card: this.card, stageName: this.stageName, ageHours: this.ageHours, labelNames: this.labels.map((l) => l.name), projectName: this.surface === 'page' ? this.projectName : null }) : [],
  );
  /** Did the grant cover whoever works it — the delegate, or with nobody holding it, the last run's agent? */
  readonly grantCovers = $derived.by<boolean | null>(() => {
    const p = this.provenance;
    if (!p) return null;
    if (p.grantCoversDelegate !== null) return p.grantCoversDelegate;
    const principal = this.agents.find((a) => a.id === this.lastAgentId)?.externalId ?? null;
    const grant = this.card?.queuedGrant ?? null;
    return grant === null || principal === null ? null : grant.includes(principal);
  });
  /** The old drawer's grant phrase, still read by the legacy layouts. */
  readonly grantSummary = $derived.by(() => {
    const p = this.provenance;
    if (!p) return '';
    if (p.grantSize === null) return 'no dispatch authority was recorded';
    if (p.grantSize === 0) return 'authorised to dispatch nobody';
    const base = `authorised to dispatch ${p.grantSize} principal${p.grantSize === 1 ? '' : 's'}`;
    if (p.grantCoversDelegate === null) return base;
    return p.grantCoversDelegate ? `${base}, including the one working it` : `${base} — NOT including the one working it`;
  });

  readonly counts = $derived<CardCounts>({
    criteria: this.acceptanceCriteria?.length ?? 0,
    planSteps: this.plan?.length ?? 0,
    specFields: Object.keys(this.card?.spec ?? {}).filter((k) => !['description', 'acceptanceCriteria', 'labels', 'due'].includes(k)).length,
    runs: this.activityGroups.length,
    links: this.linkCount,
    children: this.children.length,
    openChildren: this.card?.openChildCount ?? 0,
    decisions: this.decidedGates.length,
    refs: this.refs.length,
    attempts: this.attempts.length,
    deliveryActive: !!this.deliveryGate?.approvalSubject,
    description: !!this.card?.spec?.description,
    handoff: !!this.handoff && Object.keys(this.handoff).length > 0,
    cost: !!this.card && (this.card.costUsd > 0 || !!this.estimate?.estimatedUsd),
  });

  /** The workspace's projects, for the project picker. */
  readonly projects = $derived(app.projects);
  /** Workspace members, for the phone cards' name lookups. */
  readonly members = $derived(app.members);
  /** The board's per-card spend cap, when one is set. */
  readonly cardUsdCap = $derived<number | null>(app.board?.usage?.cardUsdCap ?? null);
  /** A person's name from the workspace members; '' for nobody. */
  /**
   * A comment author's name from the same roster the attempts use (O12): never an id or an email.
   * An agent nobody can name is "An agent"; a person nobody can name is "Someone".
   */
  authorName(a: { kind: 'human' | 'agent'; id: string; name: string | null }): string {
    const given = a.name?.trim();
    if (given && !given.includes('@')) return given;
    if (a.kind === 'agent') {
      return app.agents.find((x) => x.id === a.id || (!!x.externalId && x.externalId === a.id))?.name?.trim() || 'An agent';
    }
    const member = app.members.find((x) => x.userId === a.id)?.name?.trim();
    if (member) return member;
    return app.agents.find((x) => !!x.externalId && x.externalId === a.id)?.name?.trim() || 'Someone';
  }
  principalName(id: string | null | undefined): string { return displayPrincipal(id, app.members); }
  readonly ownerName = $derived(this.card ? this.principalName(this.card.ownerUserId) : '');

  readonly gateBinding = $derived<GateBinding | null>(
    this.gate && this.boardId
      ? { boardId: this.boardId, gate: this.gate, error: this.gateError, conflict: this.gateConflict, conflictWho: this.gateConflict ? this.principalName(this.gateConflict.decidedBy) : '', onResponse: (d, r) => this.onGateResponse(d, r), onRefresh: () => this.refreshGate() }
      : null,
  );
  readonly questionBinding = $derived.by<QuestionBinding | null>(() =>
    this.elicitation
      ? { model: this.question, elicitation: this.elicitation, agent: { id: this.elicitation.agentId, name: agentName(this.elicitation.agentId, this.agents), iconUrl: this.agents.find((a) => a.id === this.elicitation!.agentId)?.iconUrl ?? null, mood: 'needs' } }
      : null,
  );

  constructor(ctx: () => CardModelContext, opts: CardModelOptions = {}) {
    this.#ctx = ctx;
    this.#opts = opts;
    this.edit = new EditForm(this);
    this.project = new ProjectPicker(this);
    this.links = new LinkEditor(this);
    this.subtasks = new SubtaskComposer(this);
    this.refsForm = new ReferenceComposer(this);
    this.delivery = new DeliveryControls(this);
    this.comments = new CommentsModel(() => ({ boardId: this.boardId, cardId: this.cardId, onFeed: (fn) => app.onFeed(fn) }));
    this.resume = new ResumeModel(() => ({
      boardId: this.boardId, card: this.card ?? null, stages: this.stages, gatePending: !!this.gate, questionPending: !!this.elicitation,
      agentName: this.agent.name, after: async () => { await Promise.all([app.refresh(), this.refresh()]); },
    }));
    this.question = new QuestionAnswer(() => ({
      boardId: this.boardId, elicitation: this.elicitation, after: async () => { await app.refresh(); await this.refresh(); },
    }));

    $effect(() => this.question.follow(this.elicitation?.id ?? null));
    $effect(() => this.resume.follow(this.cardId));

    // The open card changed: reset the forms, then fetch what the snapshot does not carry.
    $effect(() => {
      const id = this.cardId;
      const bid = this.boardId;
      untrack(() => this.#reset());
      if (!id || !bid) return;
      untrack(() => {
        if (this.surface === 'gallery') return;
        void app.loadBoards();
        void this.#loadRelated(id);
      });
      if (!this.#opts.holdDetail) void untrack(() => this.refresh());
    });

    // The project's own record, for the milestone's name; keyed off the id so a board refresh does not refetch it.
    $effect(() => {
      const pid = this.card?.projectId ?? null;
      if (!pid) {
        this.projectDetail = null;
        return;
      }
      void getProject(pid).then((d) => { this.projectDetail = d; });
    });

    // Follow the live feed for this card (see the original comment). A gallery card has no feed.
    $effect(() => {
      const id = this.cardId;
      const bid = this.boardId;
      if (!id || !bid || this.#opts.source || this.#opts.holdDetail) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const stop = app.onFeed((event) => {
        if (event.payload?.cardId && event.payload.cardId !== id) return;
        if (timer !== undefined) return;
        timer = setTimeout(() => {
          timer = undefined;
          void this.refresh();
        }, FEED_COALESCE_MS);
      });
      return () => {
        stop();
        if (timer !== undefined) clearTimeout(timer);
      };
    });
  }

  /** Whether an attempt's timeline is open; the newest opens by default. */
  isRunOpen(runId: string, newest: boolean): boolean {
    return this.runOpen[runId] ?? newest;
  }
  toggleRun(runId: string, newest: boolean): void {
    this.runOpen = { ...this.runOpen, [runId]: !this.isRunOpen(runId, newest) };
  }
  /** Close an attempt (and stop showing its tool calls), or open it. */
  setRun(runId: string, open: boolean): void {
    this.runOpen = { ...this.runOpen, [runId]: open };
    if (!open && this.toolsShown(runId)) this.runTools = { ...this.runTools, [runId]: false };
  }
  /** Whether an attempt shows its tool calls as well as what the agent said. */
  toolsShown(runId: string): boolean {
    return this.runTools[runId] ?? false;
  }
  toggleTools(runId: string): void {
    this.runTools = { ...this.runTools, [runId]: !this.toolsShown(runId) };
  }

  #reset(): void {
    this.detail = null;
    this.attempts = [];
    this.estimate = null;
    this.edges = { links: [], externalLinks: [] };
    this.showToolCalls = false;
    this.runOpen = {};
    this.runTools = {};
    this.localError = null;
    this.gateError = null;
    this.gateConflict = null;
    this.copied = null;
    this.edit.reset();
    this.project.reset();
    this.links.reset();
    this.subtasks.reset();
    this.refsForm.reset();
    this.delivery.reset();
  }

  /** The four fetches, each on its own terms (allSettled; see the original comment). */
  async refresh(): Promise<void> {
    const id = this.cardId;
    const bid = this.boardId;
    if (!id || !bid || this.#opts.holdDetail) return;
    const [acts, atts, est, links] = await Promise.allSettled([getCardActivities(bid, id), getAttempts(bid, id), getEstimate(bid, id), listLinks(bid, id)]);
    if (this.cardId !== id) return;
    if (acts.status === 'fulfilled') this.detail = acts.value;
    if (atts.status === 'fulfilled') this.attempts = atts.value;
    if (est.status === 'fulfilled') this.estimate = est.value;
    if (links.status === 'fulfilled') this.edges = links.value;
  }

  async #loadRelated(id: string): Promise<void> {
    this.related = { phase: 'loading', items: [] };
    try {
      const items = await relatedForCard(id);
      if (this.cardId === id) this.related = { phase: 'ok', items };
    } catch (e) {
      if (this.cardId === id) this.related = { phase: isAbsent(e) ? 'absent' : 'unavailable', items: [] };
    }
  }

  async #leave(after: 'decided' | 'archived' | 'deleted'): Promise<void> {
    if (this.surface === 'gallery') return;
    if (this.surface === 'drawer') {
      app.closeCard();
      await app.refresh();
      return;
    }
    if (after === 'deleted') {
      await goto(this.boardHref);
      return;
    }
    await Promise.all([app.refresh(), this.refresh()]);
  }

  /** A refusal stays beside the buttons; a 409 says who already decided (API-1). */
  async onGateResponse(decision: GateDecision, res: Response): Promise<boolean> {
    if (!this.boardId) return false;
    if (!res.ok) {
      const conflict = res.status === 409 ? await parseGateConflict(res.clone()) : null;
      if (conflict) {
        this.gateConflict = conflict;
        this.gateError = null;
      } else {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        this.gateError = body?.error?.message ? `${body.error.message} (${res.status})` : `Couldn't record that decision (${res.status})`;
      }
      if (this.surface !== 'gallery') await Promise.all([app.refresh(), this.refresh()]);
      return false;
    }
    this.gateError = null;
    this.gateConflict = null;
    this.localError = null;
    if (this.surface === 'gallery') return true;
    if (decision === 'approve_manual') {
      await Promise.all([app.refresh(), this.refresh()]);
      return true;
    }
    await this.#leave('decided');
    return true;
  }

  /** "Refresh to see it": re-read the card and the board, then drop the conflict notice. */
  async refreshGate(): Promise<void> {
    await Promise.all([this.surface === 'gallery' ? Promise.resolve() : app.refresh(), this.#opts.holdDetail ? Promise.resolve() : this.refresh()]);
    this.gateConflict = null;
  }

  async assignToMe(): Promise<void> {
    if (!this.boardId || !this.cardId || !app.user) return;
    this.assigning = true;
    try {
      const res = await updateCard(this.boardId, this.cardId, { ownerUserId: app.user.userId });
      if (!res.ok) this.localError = `Couldn't reassign the card (${res.status})`;
      await app.refresh();
    } finally {
      this.assigning = false;
    }
  }

  async remove(): Promise<void> {
    if (!this.boardId || !this.cardId) return;
    if (!confirm('Delete this card and its history? This cannot be undone.')) return;
    const res = await deleteCard(this.boardId, this.cardId);
    if (res.ok) await this.#leave('deleted');
    else this.localError = `Couldn't delete the card (${res.status})`;
  }

  async archive(): Promise<void> {
    if (!this.boardId || !this.cardId) return;
    if (!confirm('Archive this card? It will drop off the board unless "show archived" is on.')) return;
    this.archiving = true;
    try {
      const res = await archiveCard(this.boardId, this.cardId);
      if (res.ok) await this.#leave('archived');
      else this.localError = `Couldn't archive the card (${res.status})`;
    } finally {
      this.archiving = false;
    }
  }

  /** Restore does not close anything: the card stays in view (see the original comment). */
  async restore(): Promise<void> {
    if (!this.boardId || !this.cardId) return;
    this.archiving = true;
    try {
      const res = await unarchiveCard(this.boardId, this.cardId);
      if (res.ok) await Promise.all([this.surface === 'gallery' ? Promise.resolve() : app.refresh(), this.refresh()]);
      else this.localError = `Couldn't un-archive the card (${res.status})`;
    } finally {
      this.archiving = false;
    }
  }

  #flash(kind: 'id' | 'link' | 'session' | 'spec'): void {
    this.copied = kind;
    if (this.#copiedTimer !== undefined) clearTimeout(this.#copiedTimer);
    this.#copiedTimer = setTimeout(() => { this.copied = null; }, COPIED_MS);
  }
  async #copy(text: string, kind: 'id' | 'link' | 'session' | 'spec', refused: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.#flash(kind);
    } catch {
      this.localError = refused;
    }
  }
  copyId(): Promise<void> {
    return this.#copy(this.card?.id ?? '', 'id', 'Clipboard access was refused. Select the card id and copy it.');
  }
  copyLink(): Promise<void> {
    return this.#copy(`${location.origin}${this.pageHref}`, 'link', 'Clipboard access was refused. Select the address bar and copy it.');
  }
  copySessionId(sessionId: string): Promise<void> {
    return this.#copy(sessionId, 'session', 'Clipboard access was refused. Select the session id and copy it.');
  }
  copySpec(): Promise<void> {
    return this.#copy(JSON.stringify(this.card?.spec ?? {}, null, 2), 'spec', 'Clipboard access was refused. Open View raw JSON and copy it.');
  }
}
