// apps/web/src/lib/components/inbox/inbox-ui.svelte.ts
/**
 * What a reader is in the middle of on the Inbox: the tab, the row whose resume form is open and what
 * they typed, a refusal per card, and which Activity rows show their earlier entries. One page draws
 * it in every vibe; the model (`InboxStore`) does the work.
 */
import { tick } from 'svelte';
import type { NeedRow } from '../operate/operate-types';
import { moveTargets } from '../operate/operate-data';
import { MOVE_FAILED, moveAllStopped } from './inbox-words';

export type InboxTab = 'needs' | 'running' | 'spend' | 'activity';

/** The calls the reader's actions make, so a test can hand in a stand-in. */
export interface InboxActions {
  resume(row: NeedRow, comment: string, toStageKey: string): Promise<string | null>;
  move(row: NeedRow, toStageKey: string): Promise<string | null>;
}

export class InboxUi {
  tab = $state<InboxTab>('needs');
  resuming = $state<string | null>(null);
  resumeAt = $state('');
  text = $state('');
  busy = $state(false);
  refusals = $state<Record<string, string>>({});
  earlierOpen = $state<Record<string, boolean>>({});
  /** How many earlier entries an Activity row shows once open (rule 7). */
  earlierShown = $state<Record<string, number>>({});
  /** Why "Move all" stopped part way, said once under the group's actions. */
  moveAllNote = $state<string | null>(null);
  readonly canSend = $derived(this.text.trim().length > 0 && !this.busy);
  readonly #actions: () => InboxActions;

  constructor(actions: () => InboxActions) { this.#actions = actions; }

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
      const refused = await this.#actions().resume(row, this.text.trim(), this.resumeAt);
      if (refused) this.refusals[row.item.cardId] = refused;
      else this.cancel();
    } finally {
      this.busy = false;
    }
  }

  async move(row: NeedRow, toKey: string): Promise<void> {
    const refused = await this.#refusal(row, toKey);
    if (refused) this.refusals[row.item.cardId] = refused;
    else delete this.refusals[row.item.cardId];
  }

  /**
   * "Move all N…": each card to its own board's stage of that name, one after another. The first
   * refusal or failure stops it, and the page says how many moved and why the rest did not.
   */
  async moveAll(rows: NeedRow[], stageName: string): Promise<void> {
    this.moveAllNote = null;
    const todo = rows.flatMap((row) => {
      const to = moveTargets(row.stages, row.item.stageKey).find((s) => s.name === stageName);
      return to ? [{ row, key: to.key }] : [];
    });
    let moved = 0;
    for (const { row, key } of todo) {
      const refused = await this.#refusal(row, key);
      if (refused) { this.moveAllNote = moveAllStopped(moved, todo.length, refused); return; }
      moved += 1;
    }
  }

  /** A move's refusal, or the failure said in words; null when it moved. */
  async #refusal(row: NeedRow, toKey: string): Promise<string | null> {
    try {
      return await this.#actions().move(row, toKey);
    } catch {
      return MOVE_FAILED;
    }
  }

  toggleEarlier(cardId: string): void { this.earlierOpen[cardId] = !this.earlierOpen[cardId]; }
}

/** The stage names every row can move to (an unclaimed group spans boards, so a name, not a key). */
export function commonTargets(rows: NeedRow[]): string[] {
  const [first, ...rest] = rows.map((r) => moveTargets(r.stages, r.item.stageKey).map((s) => s.name));
  if (!first) return [];
  return first.filter((name) => rest.every((names) => names.includes(name)));
}
