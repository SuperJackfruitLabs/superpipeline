/** A link attached to a card, optionally attributed to the run that produced it. */
export interface Reference {
  id: string;
  cardId: string;
  /**
   * The run that attached this, when an agent did it mid-run. Null for a human's, and for every
   * reference from before the column existed — both of which belong to the card rather than to a
   * stage.
   */
  runId?: string | null;
  url: string;
  title?: string | null;
  subtitle?: string | null;
  provider: string;
  sourceType: string;
  externalId?: string | null;
  metadata?: Record<string, unknown> | null;
  addedBy: 'agent' | 'user';
}
