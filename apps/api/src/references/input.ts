import type { JsonValue } from '../json';

/** A reference as the Board DO stores it (`addReference`), after `resolveReferenceInput` enriched it. */
export interface ReferenceInput {
  cardId: string;
  url: string;
  /** The run attaching it, when an agent is. Omitted by a human path, and NULL is the honest value. */
  runId?: string | null;
  provider: string;
  sourceType: string;
  title?: string;
  subtitle?: string;
  externalId?: string;
  metadata?: JsonValue;
  addedBy?: 'agent' | 'user';
  syncState?: 'synced' | 'stale' | 'error';
  lastSyncedAt?: string;
}
