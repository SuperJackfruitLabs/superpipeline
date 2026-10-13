// apps/web/src/lib/components/card/card-forms.svelte.ts
/**
 * The card's small forms, moved verbatim from CardDrawer.svelte: edit, project, links, sub-tasks,
 * references, delivery. Each holds its own state and calls back into the model it belongs to.
 */
import { addLink, addReference, getBoard, getProject, removeLink, splitCard, updateApprovalDelivery, updateCard, type LinkKind, type Milestone } from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import { resolveCardLabelsForEdit } from '$lib/components/card-labels';
import { edgeKey, type RemoveArgs } from '$lib/components/link-groups';
import { crossBoardNotice, linkRefusalSentence, submitAddBlocker, type LinkKindChoice } from '$lib/components/add-blocker';
import { assignmentPatch, milestonesForProject } from '$lib/components/milestone-picker';
import type { CardModel } from './card-model.svelte';

type Refusal = { error?: { code?: string; message?: string } } | null;
const refusalBody = async (res: Response): Promise<Refusal> => (await res.json().catch(() => null)) as Refusal;

export class EditForm {
  editing = $state(false);
  title = $state('');
  priority = $state(0);
  desc = $state('');
  labels = $state('');
  /** See the original comment in CardDrawer: a blind catalogue must not be able to wipe labels. */
  labelsBlind = $state(false);
  ac = $state('');
  due = $state('');
  saving = $state(false);
  #m: CardModel;
  constructor(m: CardModel) {
    this.#m = m;
  }
  reset(): void {
    this.editing = false;
  }
  start(): void {
    const card = this.#m.card;
    if (!card || this.editing) return;
    this.title = card.title;
    this.priority = card.priority;
    this.desc = (card.spec?.description as string | undefined) ?? '';
    const byName = new Map([...app.labelById()].map(([id, l]) => [id, l.name]));
    const resolved = resolveCardLabelsForEdit(card.labels, byName);
    this.labels = resolved.text;
    this.labelsBlind = resolved.blind;
    this.ac = (Array.isArray(card.spec?.acceptanceCriteria) ? (card.spec!.acceptanceCriteria as string[]) : []).join('\n');
    this.due = card.dueAt ?? '';
    this.editing = true;
  }
  cancel(): void {
    this.editing = false;
  }
  async save(): Promise<void> {
    const { boardId, cardId, card } = this.#m;
    if (!boardId || !cardId || this.title.trim() === '') return;
    this.saving = true;
    try {
      const labelNames = this.labelsBlind ? undefined : this.labels.split(',').map((l) => l.trim()).filter(Boolean);
      const ac = this.ac.split('\n').map((l) => l.trim()).filter(Boolean);
      const res = await updateCard(boardId, cardId, {
        title: this.title.trim(),
        priority: Number(this.priority) || 0,
        spec: { ...(card?.spec ?? {}), description: this.desc, acceptanceCriteria: ac },
        ...(labelNames !== undefined ? { labelNames } : {}),
        dueAt: this.due.trim() === '' ? null : this.due.trim(),
      });
      if (!res.ok) this.#m.localError = `Couldn't save the card (${res.status})`;
      this.editing = false;
      await app.refresh();
      void this.#m.refresh();
    } finally {
      this.saving = false;
    }
  }
}

export class ProjectPicker {
  editing = $state(false);
  projectId = $state('');
  milestoneId = $state('');
  milestones = $state<Milestone[]>([]);
  saving = $state(false);
  error = $state<string | null>(null);
  #m: CardModel;
  constructor(m: CardModel) {
    this.#m = m;
  }
  reset(): void {
    this.editing = false;
    this.error = null;
  }
  start(): void {
    const card = this.#m.card;
    if (!card) return;
    this.projectId = card.projectId ?? '';
    this.milestoneId = card.milestoneId ?? '';
    const d = this.#m.projectDetail;
    this.milestones = d && d.project.id === this.projectId ? milestonesForProject(d.milestones, this.projectId) : [];
    this.error = null;
    this.editing = true;
  }
  cancel(): void {
    this.editing = false;
  }
  /** Clearing the milestone first is the chosen answer to MILESTONE_NOT_IN_PROJECT (see the original comment). */
  async onProjectChange(): Promise<void> {
    this.milestoneId = '';
    if (!this.projectId) {
      this.milestones = [];
      return;
    }
    const d = await getProject(this.projectId);
    this.milestones = d ? milestonesForProject(d.milestones, this.projectId) : [];
  }
  async save(): Promise<void> {
    const { boardId, cardId, card } = this.#m;
    if (!boardId || !cardId || !card || this.saving) return;
    this.saving = true;
    this.error = null;
    try {
      const patch = assignmentPatch(
        { projectId: card.projectId, milestoneId: card.milestoneId },
        { projectId: this.projectId === '' ? null : this.projectId, milestoneId: this.milestoneId === '' ? null : this.milestoneId },
      );
      if (Object.keys(patch).length === 0) {
        this.editing = false;
        return;
      }
      const res = await updateCard(boardId, cardId, patch);
      if (!res.ok) {
        this.error = linkRefusalSentence((await refusalBody(res))?.error, res.status);
        return;
      }
      this.editing = false;
      await app.refresh();
    } finally {
      this.saving = false;
    }
  }
}

export class LinkEditor {
  open = $state(false);
  boardId = $state('');
  cardId = $state('');
  kind = $state<LinkKindChoice>('blocks');
  boardCards = $state<{ id: string; title: string }[]>([]);
  adding = $state(false);
  error = $state<string | null>(null);
  listError = $state<string | null>(null);
  removing = $state(new Set<string>());
  #m: CardModel;
  readonly crossBoardNotice = $derived.by(() => (this.#m.boardId ? crossBoardNotice(this.boardId, this.#m.boardId) : null));
  constructor(m: CardModel) {
    this.#m = m;
  }
  reset(): void {
    this.open = false;
    this.error = null;
    this.listError = null;
  }
  #sameBoardCards(): { id: string; title: string }[] {
    return (this.#m.board?.cards ?? []).filter((c) => c.id !== this.#m.cardId);
  }
  openAdd(): void {
    if (!this.#m.boardId || !this.#m.cardId) return;
    this.open = true;
    this.boardId = this.#m.boardId;
    this.cardId = '';
    this.kind = 'blocks';
    this.error = null;
    this.boardCards = this.#sameBoardCards();
  }
  cancel(): void {
    this.open = false;
  }
  async onBoardChange(): Promise<void> {
    this.cardId = '';
    if (!this.#m.boardId || !this.#m.cardId) return;
    if (this.boardId === this.#m.boardId) {
      this.boardCards = this.#sameBoardCards();
      return;
    }
    if (!this.boardId) {
      this.boardCards = [];
      return;
    }
    try {
      this.boardCards = (await getBoard(this.boardId)).cards;
    } catch {
      this.boardCards = [];
    }
  }
  async add(): Promise<void> {
    const { boardId, cardId } = this.#m;
    if (!boardId || !cardId || !this.boardId || !this.cardId || this.adding) return;
    this.adding = true;
    this.error = null;
    try {
      const res = await submitAddBlocker(
        { blockerBoardId: this.boardId, blockerCardId: this.cardId, thisBoardId: boardId, thisCardId: cardId, kind: this.kind },
        { addLink: (bid, from, to, kind, toBoardId) => addLink(bid, from, to, kind as LinkKind, toBoardId), notify: () => {} },
      );
      if (!res.ok) {
        this.error = linkRefusalSentence((await refusalBody(res))?.error, res.status);
        return;
      }
      this.open = false;
      await app.refresh();
      void this.#m.refresh();
    } finally {
      this.adding = false;
    }
  }
  async remove(args: RemoveArgs): Promise<void> {
    const key = edgeKey(args);
    if (this.removing.has(key)) return;
    this.removing = new Set(this.removing).add(key);
    this.listError = null;
    try {
      const res = await removeLink(args.boardId, args.fromCardId, args.toCardId, args.kind, args.toBoardId);
      if (!res.ok) {
        this.listError = linkRefusalSentence((await refusalBody(res))?.error, res.status);
        return;
      }
      await app.refresh();
      void this.#m.refresh();
    } finally {
      const next = new Set(this.removing);
      next.delete(key);
      this.removing = next;
    }
  }
}

export class SubtaskComposer {
  title = $state('');
  adding = $state(false);
  error = $state<string | null>(null);
  #m: CardModel;
  constructor(m: CardModel) {
    this.#m = m;
  }
  reset(): void {
    this.title = '';
    this.error = null;
  }
  async add(): Promise<void> {
    const { boardId, cardId } = this.#m;
    if (!boardId || !cardId || this.title.trim() === '' || this.adding) return;
    this.adding = true;
    this.error = null;
    try {
      const res = await splitCard(boardId, cardId, [this.title.trim()]);
      if (!res.ok) {
        this.error = linkRefusalSentence((await refusalBody(res))?.error, res.status);
        return;
      }
      this.title = '';
      await app.refresh();
    } finally {
      this.adding = false;
    }
  }
}

export class ReferenceComposer {
  url = $state('');
  #m: CardModel;
  constructor(m: CardModel) {
    this.#m = m;
  }
  reset(): void {
    this.url = '';
  }
  async add(): Promise<void> {
    const { boardId, cardId } = this.#m;
    if (!boardId || !cardId || this.url.trim() === '') return;
    const res = await addReference(boardId, cardId, { url: this.url.trim() });
    if (res.ok) {
      this.url = '';
      await app.refresh();
    } else {
      this.#m.localError = `Couldn't add that link (${res.status})`;
    }
  }
}

export class DeliveryControls {
  liveUrl = $state('');
  saving = $state(false);
  copied = $state<number | null>(null);
  #m: CardModel;
  constructor(m: CardModel) {
    this.#m = m;
  }
  reset(): void {
    this.liveUrl = '';
    this.saving = false;
    this.copied = null;
  }
  async change(update: { mode: 'manual' | 'automatic' } | { liveUrl: string }): Promise<void> {
    const gate = this.#m.deliveryGate;
    const boardId = this.#m.boardId;
    if (!boardId || !gate || this.saving) return;
    this.saving = true;
    this.#m.gateError = null;
    try {
      const res = await updateApprovalDelivery(boardId, gate.id, update);
      if (!res.ok) {
        this.#m.gateError = (await refusalBody(res))?.error?.message ?? `Couldn't update delivery (${res.status})`;
        return;
      }
      if ('liveUrl' in update) this.liveUrl = '';
      await Promise.all([app.refresh(), this.#m.refresh()]);
    } finally {
      this.saving = false;
    }
  }
  async copy(index: number, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied = index;
    } catch {
      this.#m.gateError = 'Clipboard access was refused. Select the exact text manually.';
    }
  }
}
