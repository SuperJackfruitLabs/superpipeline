/**
 * Answering an agent's question (docs/04 §4), the same in every vibe. The agent is blocked and
 * still holds its lease; a failure says so beside the question rather than parking the card.
 */
import { answerElicitation, type Elicitation } from '$lib/api';

export interface QuestionContext {
  boardId: string | null;
  elicitation: Elicitation | undefined;
  after: () => Promise<void>;
}

export class QuestionAnswer {
  text = $state('');
  selected = $state<string | null>(null);
  answering = $state(false);
  error = $state<string | null>(null);
  #ctx: () => QuestionContext;
  #last: string | null = null;

  constructor(ctx: () => QuestionContext) {
    this.#ctx = ctx;
  }

  follow(id: string | null): void {
    if (id === this.#last) return;
    this.#last = id;
    this.text = '';
    this.selected = null;
    this.error = null;
  }

  async send(option?: string): Promise<boolean> {
    const { boardId, elicitation, after } = this.#ctx();
    if (!boardId || !elicitation || this.answering) return false;
    const text = this.text.trim();
    if (!option && text === '') {
      this.error = elicitation.options.length > 0 ? 'Pick one of the options.' : 'Type an answer first.';
      return false;
    }
    this.answering = true;
    try {
      const res = await answerElicitation(boardId, elicitation.id, { option, text: text || undefined });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        this.error = body?.error?.message ?? `Couldn't send that answer (${res.status})`;
      } else {
        this.error = null;
        this.text = '';
        this.selected = null;
      }
      await after();
      return res.ok;
    } finally {
      this.answering = false;
    }
  }

  submit(): Promise<boolean> {
    return this.send(this.selected ?? undefined);
  }
}
