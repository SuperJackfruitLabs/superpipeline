// apps/web/src/lib/components/card/resume-model.svelte.ts
/**
 * Sending a stopped card back to work (moved from CardResume.svelte + ResumeBox.svelte). The note
 * is required: it is the next attempt's feedback. The button is never disabled; an empty note is
 * a field error that names the agent, and no request is made.
 */
import { resumeCard, type Card, type Stage } from '$lib/api';
import { refusalOf } from '$lib/components/attention/refusal';
import { emptyNoteError, noteHint } from './card-words';

export interface ResumeTarget { key: string; n: number; name: string; current: boolean; allowed: boolean }
export const RESUME_NOTE_MAX = 8000;

export function resumeTargets(stages: Stage[], currentKey: string): ResumeTarget[] {
  const idx = stages.findIndex((s) => s.key === currentKey);
  return stages.map((s, i) => ({ key: s.key, n: i + 1, name: s.name, current: i === idx, allowed: idx >= 0 && i <= idx }));
}
export function resumeShows(card: Pick<Card, 'state' | 'openChildCount'>, gatePending: boolean, questionPending: boolean): boolean {
  return card.state === 'input-required' && !gatePending && !questionPending && card.openChildCount === 0;
}

export interface ResumeContext { boardId: string | null; card: Card | null; stages: Stage[]; gatePending: boolean; questionPending: boolean; agentName: string; after: () => Promise<void> }

/** A half-typed note outlives a page load (the reconnect sign-in leaves and comes back): one key per card. */
export const resumeDraftKey = (cardId: string) => `sp:draft:resume:${cardId}`;
function readDraft(cardId: string): string {
  try { return sessionStorage.getItem(resumeDraftKey(cardId)) ?? ''; } catch { return ''; }
}
function writeDraft(cardId: string, text: string): void {
  try {
    if (text === '') sessionStorage.removeItem(resumeDraftKey(cardId));
    else sessionStorage.setItem(resumeDraftKey(cardId), text);
  } catch { /* storage blocked: the note lives only in the page */ }
}

export class ResumeModel {
  target = $state('');
  #note = $state('');
  busy = $state(false);
  error = $state<string | null>(null);
  noteEl = $state<HTMLTextAreaElement | undefined>();
  #ctx: () => ResumeContext;
  #last: string | null = null;

  constructor(ctx: () => ResumeContext) {
    this.#ctx = ctx;
  }
  get show(): boolean {
    const { card, gatePending, questionPending } = this.#ctx();
    return !!card && resumeShows(card, gatePending, questionPending);
  }
  get targets(): ResumeTarget[] {
    const { card, stages } = this.#ctx();
    return card ? resumeTargets(stages, card.currentStageKey) : [];
  }
  /** The note; every edit is kept in sessionStorage for this card, and sending clears it. */
  get note(): string {
    return this.#note;
  }
  set note(text: string) {
    this.#note = text;
    if (this.#last) writeDraft(this.#last, text);
  }
  get hint(): string {
    return noteHint(this.note.length);
  }
  /**
   * Reset when the card changes; the target starts at the card's own stage. A card page opens before
   * its board has loaded: wait for the card, or the target starts empty and the select shows nothing.
   */
  follow(cardId: string | null): void {
    if (cardId === this.#last) return;
    if (cardId && !this.#ctx().card) return;
    this.#last = cardId;
    this.#note = cardId ? readDraft(cardId) : '';
    this.error = null;
    this.target = this.#ctx().card?.currentStageKey ?? '';
  }
  async submit(): Promise<void> {
    const { boardId, card, agentName, after } = this.#ctx();
    if (!boardId || !card || this.busy) return;
    const text = this.note.trim();
    if (text === '') {
      this.error = emptyNoteError(agentName);
      this.noteEl?.focus();
      return;
    }
    this.busy = true;
    this.error = null;
    try {
      const to = this.target && this.target !== card.currentStageKey ? this.target : undefined;
      const refused = await refusalOf(await resumeCard(boardId, card.id, text, to));
      if (refused) {
        this.error = refused;
        return;
      }
      this.note = '';
      await after();
    } finally {
      this.busy = false;
    }
  }
}
