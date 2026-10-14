// apps/web/src/lib/components/operate/operate-ui.svelte.ts
/**
 * What a reader is doing on Operate right now — the row whose resume form is open, what they typed,
 * which texts are expanded — shared by the four layouts so each only draws it.
 */
import { tick } from 'svelte';
import type { NeedRow, OperateModel, SpendView } from './layouts/types';
import { moveTargets } from './operate-data';

export class OperateUi {
  expanded = $state<Record<string, boolean>>({});
  earlierOpen = $state<Record<string, boolean>>({});
  resuming = $state<string | null>(null);
  resumeAt = $state('');
  text = $state('');
  busy = $state(false);
  refusals = $state<Record<string, string>>({});
  moveTo = $state<Record<string, string>>({});
  readonly canSend = $derived(this.text.trim().length > 0 && !this.busy);
  readonly #model: () => OperateModel;

  constructor(model: () => OperateModel) { this.#model = model; }
  private model(): OperateModel { return this.#model(); }

  toggle(cardId: string): void { this.expanded[cardId] = !this.expanded[cardId]; }
  toggleEarlier(cardId: string): void { this.earlierOpen[cardId] = !this.earlierOpen[cardId]; }

  /** Opens the row's resume form and moves focus to its "Resume at" picker. */
  async openResume(row: NeedRow): Promise<void> {
    this.resuming = row.item.cardId;
    this.resumeAt = row.item.stageKey;
    this.text = '';
    delete this.refusals[row.item.cardId];
    await tick();
    document.getElementById(`resume-at-${row.item.cardId}`)?.focus();
  }

  cancel(): void { this.resuming = null; this.text = ''; }

  async send(row: NeedRow): Promise<void> {
    if (!this.canSend) return;
    this.busy = true;
    try {
      const refused = await this.model().resume(row, this.text.trim(), this.resumeAt);
      if (refused) this.refusals[row.item.cardId] = refused;
      else this.cancel();
    } finally {
      this.busy = false;
    }
  }

  async move(row: NeedRow, toKey?: string): Promise<void> {
    const key = toKey ?? this.moveTo[row.item.cardId] ?? moveTargets(row.stages, row.item.stageKey)[0]?.key;
    if (!key) return;
    const refused = await this.model().move(row, key);
    if (refused) this.refusals[row.item.cardId] = refused;
    else delete this.refusals[row.item.cardId];
  }

  /** An activity group's Resume or Move: opens the Needs row's control and brings it into view. */
  async fromActivity(row: NeedRow, anchor: string): Promise<void> {
    document.getElementById(anchor)?.scrollIntoView?.({ block: 'start' });
    if (row.actions.includes('resume')) await this.openResume(row);
    else document.getElementById(`mv-${row.item.cardId}`)?.focus();
  }
}

export class CapsUi {
  editing = $state(false);
  board = $state('');
  card = $state('');
  boardError = $state<string | null>(null);
  cardError = $state<string | null>(null);
  refused = $state<string | null>(null);
  saving = $state(false);
  readonly #model: () => OperateModel;

  constructor(model: () => OperateModel) { this.#model = model; }
  private model(): OperateModel { return this.#model(); }

  start(spend: SpendView): void {
    this.board = spend.cap?.toString() ?? '';
    this.card = spend.cardCap?.toString() ?? '';
    this.boardError = this.cardError = this.refused = null;
    this.editing = true;
  }

  cancel(spend: SpendView): void { this.start(spend); this.editing = false; }

  async save(): Promise<void> {
    this.saving = true;
    try {
      const r = await this.model().setCaps(this.board, this.card);
      this.boardError = r?.board ?? null;
      this.cardError = r?.card ?? null;
      this.refused = r?.refused ?? null;
      if (r === null) this.editing = false;
    } finally {
      this.saving = false;
    }
  }
}
