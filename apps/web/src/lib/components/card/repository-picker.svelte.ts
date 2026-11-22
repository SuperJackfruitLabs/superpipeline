// apps/web/src/lib/components/card/repository-picker.svelte.ts
/**
 * The card's repository picker: tick the repositories from its bench stage's allowlist and, when
 * more than one is ticked without the stage's start repository, say where the work starts. Saved
 * whole with one PATCH. The board refuses a choice outside the allowlist, or one made after the
 * card's bench exists; its sentence is shown as it came.
 */
import { updateCard, type Stage } from '$lib/api';
import { app } from '$lib/stores/app.svelte';
import type { CardFormHost } from './card-forms.svelte';
import { choicePatch, choosableRepositories, choosingPolicy, needsPrimary, startRepository } from './card-repositories';

/** The board's own sentence from a refusal body, when it has one. */
function refusalMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('error' in body)) return null;
  const error: unknown = body.error;
  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' ? error.message : null;
}

export class RepositoryPicker {
  editing = $state(false);
  chosen = $state<string[]>([]);
  primary = $state('');
  saving = $state(false);
  error = $state<string | null>(null);
  #m: CardFormHost;
  constructor(m: CardFormHost) {
    this.#m = m;
  }
  #stages(): Stage[] {
    return this.#m.board?.stages ?? [];
  }
  #stage(): Stage | undefined {
    const card = this.#m.card;
    return card ? this.#stages().find((s) => s.key === card.currentStageKey) : undefined;
  }
  /** Every name the picker offers, sorted; a name the card holds that the stage dropped stays, so it can be unticked. */
  readonly options = $derived.by(() => {
    const card = this.#m.card;
    if (!card) return [];
    return [...new Set([...choosableRepositories(this.#stages(), card.currentStageKey), ...(card.repositories ?? [])])].toSorted();
  });
  readonly policy = $derived.by(() => choosingPolicy(this.#stage()));
  /** The start repository the choice gives now, or null when the person must name one. */
  readonly start = $derived.by(() => startRepository(this.chosen, this.primary, this.policy));
  readonly mustName = $derived.by(() => needsPrimary(this.chosen, this.primary, this.policy));
  reset(): void {
    this.editing = false;
    this.error = null;
  }
  open(): void {
    const card = this.#m.card;
    if (!card) return;
    this.chosen = [...(card.repositories ?? [])];
    this.primary = card.primaryRepository ?? '';
    this.error = null;
    this.editing = true;
  }
  toggle(name: string, on: boolean): void {
    this.chosen = on ? [...new Set([...this.chosen, name])].toSorted() : this.chosen.filter((n) => n !== name);
    if (!this.chosen.includes(this.primary)) this.primary = '';
  }
  cancel(): void {
    this.editing = false;
    this.error = null;
  }
  async save(): Promise<void> {
    const { boardId, cardId, card } = this.#m;
    if (!boardId || !cardId || !card || this.saving || this.mustName) return;
    this.saving = true;
    this.error = null;
    try {
      const res = await updateCard(boardId, cardId, choicePatch(this.chosen, this.primary, this.policy));
      if (!res.ok) {
        const body: unknown = await res.json().catch(() => null);
        this.error = refusalMessage(body) ?? `Couldn't save the repositories (${res.status})`;
        return;
      }
      this.editing = false;
      await app.refresh();
    } finally {
      this.saving = false;
    }
  }
}
